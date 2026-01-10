# ============================================================
# MOEX NG SUPERTREND ATR — PARAMETER OPTIMIZATION
# Поиск лучших ATR_LEN и ATR_FACTOR для максимальной прибыли
# ============================================================

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timezone
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import itertools
from concurrent.futures import ThreadPoolExecutor, as_completed

# =========================
# CONFIG
# =========================
BASE = "NG"
START_DATE = "2020-01-31"
END_DATE = datetime.now(timezone.utc).strftime("%Y-%m-%d")
INTERVAL = 24

INITIAL_CAPITAL = 10_000.0
POSITION_PCT = 100.0

# Диапазоны для оптимизации
ATR_LEN_RANGE = list(range(3, 31))  # от 3 до 30
ATR_FACTOR_RANGE = [round(x * 0.05, 2) for x in range(1, 61)]  # от 0.05 до 3.0 с шагом 0.05

REPORT_PATH = "moex_ng_supertrend_optimization_report.html"

# =========================
# MOEX HELPERS
# =========================
def iss_get(url, params=None):
    r = requests.get(url, params=params or {}, timeout=30)
    r.raise_for_status()
    return r.json()

def get_ng_contracts():
    url = "https://iss.moex.com/iss/securities.json"
    j = iss_get(url, {
        "q": "NG-",
        "limit": 1000,
        "iss.meta": "off",
        "iss.only": "securities",
        "securities.columns": "secid,shortname,name,group,primary_boardid"
    })
    df = pd.DataFrame(j["securities"]["data"], columns=j["securities"]["columns"])
    df = df[(df["group"] == "futures_forts") & (df["primary_boardid"] == "RFUD")].copy()
    df = df[df["secid"].str.match(r"^NG[A-Z]\d$", na=False)].copy()
    df = df.sort_values("secid").reset_index(drop=True)
    return df

def load_candles(secid):
    url = f"https://iss.moex.com/iss/engines/futures/markets/forts/securities/{secid}/candles.json"
    frames = []
    start_pos = 0

    while True:
        j = iss_get(url, {
            "from": START_DATE,
            "till": END_DATE,
            "interval": INTERVAL,
            "start": start_pos,
            "iss.meta": "off",
            "iss.only": "candles",
            "candles.columns": "begin,open,high,low,close,volume"
        })
        rows = j["candles"]["data"]
        if not rows:
            break

        df = pd.DataFrame(rows, columns=["date","open","high","low","close","volume"])
        frames.append(df)

        got = len(df)
        start_pos += got
        if got < 100:
            break

    if not frames:
        return pd.DataFrame()

    out = pd.concat(frames, ignore_index=True)
    out["date"] = pd.to_datetime(out["date"], utc=True)
    out = out.sort_values("date").set_index("date")
    return out

def build_continuous_ng(min_bars_per_contract=50):
    contracts = get_ng_contracts()
    if contracts.empty:
        raise ValueError("No NG futures found")

    series = []
    for secid in contracts["secid"].tolist():
        try:
            df = load_candles(secid)
            if df.empty or len(df) < min_bars_per_contract:
                continue
            df = df[["open","high","low","close","volume"]].copy()
            series.append(df)
        except Exception:
            continue

    if not series:
        raise ValueError("NG contracts loaded = 0")

    df_all = pd.concat(series).sort_index()
    numeric = df_all[["open","high","low","close","volume"]]
    cont = numeric.groupby(numeric.index).mean().sort_index()
    return cont

# =========================
# INDICATORS
# =========================
def atr_wilder(df, n):
    high = df["high"]
    low = df["low"]
    close = df["close"]
    prev_close = close.shift(1)

    tr = pd.concat([
        (high - low).abs(),
        (high - prev_close).abs(),
        (low - prev_close).abs()
    ], axis=1).max(axis=1)

    return tr.ewm(alpha=1/n, adjust=False).mean()

def supertrend(df, atr_len, factor):
    atr_v = atr_wilder(df, atr_len)
    hl2 = (df["high"] + df["low"]) / 2.0

    upper_basic = hl2 + factor * atr_v
    lower_basic = hl2 - factor * atr_v

    upper = upper_basic.copy()
    lower = lower_basic.copy()

    for i in range(1, len(df)):
        prev_close = df["close"].iloc[i-1]
        upper.iloc[i] = upper_basic.iloc[i] if (upper_basic.iloc[i] < upper.iloc[i-1]) or (prev_close > upper.iloc[i-1]) else upper.iloc[i-1]
        lower.iloc[i] = lower_basic.iloc[i] if (lower_basic.iloc[i] > lower.iloc[i-1]) or (prev_close < lower.iloc[i-1]) else lower.iloc[i-1]

    direction = pd.Series(index=df.index, dtype=int)
    direction.iloc[0] = 0

    for i in range(1, len(df)):
        c = df["close"].iloc[i]
        prev_dir = direction.iloc[i-1]

        if prev_dir == 0:
            direction.iloc[i] = -1 if c <= upper.iloc[i] else +1
            continue

        if prev_dir == +1:
            direction.iloc[i] = -1 if c < lower.iloc[i] else +1
        else:
            direction.iloc[i] = +1 if c > upper.iloc[i] else -1

    return direction

# =========================
# BACKTEST
# =========================
def backtest(df, atr_len, factor):
    """Быстрый бэктест для оптимизации"""
    if len(df) < atr_len + 5:
        return {
            "atr_len": atr_len,
            "factor": factor,
            "final_capital": INITIAL_CAPITAL,
            "total_return": 0.0,
            "max_drawdown": 0.0,
            "trades": 0,
            "sharpe": np.nan,
            "winrate": np.nan
        }
    
    direction = supertrend(df, atr_len, factor)
    dchg = direction.diff()

    long_sig = (dchg < 0).fillna(False)
    short_sig = (dchg > 0).fillna(False)

    equity = INITIAL_CAPITAL
    pos = 0
    entry_price = 0.0
    qty = 0

    equity_curve = []
    wins = 0
    total_trades = 0

    def units(eq, px):
        budget = eq * (POSITION_PCT / 100.0)
        return int(np.floor(budget / px)) if px > 0 else 0

    for i in range(1, len(df)):
        px = float(df["close"].iloc[i])

        # exit/reverse
        if pos != 0:
            if (pos == 1 and short_sig.iloc[i]) or (pos == -1 and long_sig.iloc[i]):
                pnl = (px - entry_price) * pos * qty
                equity += pnl
                if pnl > 0:
                    wins += 1
                total_trades += 1
                pos = 0
                entry_price = 0.0
                qty = 0

        # entry
        if pos == 0:
            if long_sig.iloc[i]:
                q = units(equity, px)
                if q > 0:
                    pos = 1
                    qty = q
                    entry_price = px
            elif short_sig.iloc[i]:
                q = units(equity, px)
                if q > 0:
                    pos = -1
                    qty = q
                    entry_price = px

        # mark-to-market
        mtm = equity
        if pos != 0 and qty > 0:
            mtm = equity + (px - entry_price) * pos * qty
        equity_curve.append(mtm)

    if not equity_curve:
        return {
            "atr_len": atr_len,
            "factor": factor,
            "final_capital": INITIAL_CAPITAL,
            "total_return": 0.0,
            "max_drawdown": 0.0,
            "trades": 0,
            "sharpe": np.nan,
            "winrate": np.nan
        }

    eq = pd.Series(equity_curve)
    final_cap = float(eq.iloc[-1])
    total_return = final_cap / INITIAL_CAPITAL - 1

    peak = eq.cummax()
    dd = eq / peak - 1
    max_dd = float(dd.min())

    rets = eq.pct_change().dropna()
    sharpe = float(rets.mean() / rets.std() * np.sqrt(252)) if len(rets) > 1 and rets.std() > 0 else np.nan

    winrate = wins / total_trades if total_trades > 0 else np.nan

    return {
        "atr_len": atr_len,
        "factor": factor,
        "final_capital": final_cap,
        "total_return": total_return,
        "max_drawdown": max_dd,
        "trades": total_trades,
        "sharpe": sharpe,
        "winrate": winrate
    }

# =========================
# OPTIMIZATION
# =========================
def optimize(df):
    """Перебор всех комбинаций параметров"""
    results = []
    total = len(ATR_LEN_RANGE) * len(ATR_FACTOR_RANGE)
    
    print(f"[INFO] Запуск оптимизации: {len(ATR_LEN_RANGE)} ATR_LEN x {len(ATR_FACTOR_RANGE)} FACTOR = {total} комбинаций")
    
    count = 0
    for atr_len in ATR_LEN_RANGE:
        for factor in ATR_FACTOR_RANGE:
            result = backtest(df, atr_len, factor)
            results.append(result)
            count += 1
            if count % 100 == 0:
                print(f"  Прогресс: {count}/{total} ({100*count/total:.1f}%)")
    
    return pd.DataFrame(results)

# =========================
# REPORT
# =========================
def make_optimization_report(df_price, results_df):
    # Сортируем по прибыли
    results_sorted = results_df.sort_values("final_capital", ascending=False).reset_index(drop=True)
    
    # Лучшие 20 комбинаций
    top20 = results_sorted.head(20).copy()
    
    # Лучший результат
    best = results_sorted.iloc[0]
    
    # Создаём heatmap для визуализации
    pivot = results_df.pivot_table(
        values="total_return", 
        index="atr_len", 
        columns="factor",
        aggfunc="first"
    )
    
    # Создаём графики
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=(
            "Heatmap: Return by ATR_LEN x FACTOR",
            "Top 20 Combinations",
            f"Best Equity Curve (ATR={int(best['atr_len'])}, F={best['factor']:.2f})",
            "Price Chart"
        ),
        specs=[
            [{"type": "heatmap"}, {"type": "bar"}],
            [{"type": "scatter"}, {"type": "candlestick"}]
        ],
        vertical_spacing=0.12,
        horizontal_spacing=0.08
    )
    
    # Heatmap
    fig.add_trace(
        go.Heatmap(
            z=pivot.values * 100,  # в процентах
            x=[f"{f:.2f}" for f in pivot.columns],
            y=pivot.index.tolist(),
            colorscale="RdYlGn",
            colorbar=dict(title="Return %", x=0.45),
            hovertemplate="ATR: %{y}<br>Factor: %{x}<br>Return: %{z:.1f}%<extra></extra>"
        ),
        row=1, col=1
    )
    
    # Top 20 bar chart
    top20_labels = [f"ATR={int(r['atr_len'])}, F={r['factor']:.2f}" for _, r in top20.iterrows()]
    top20_returns = (top20["total_return"] * 100).tolist()
    colors = ["green" if r > 0 else "red" for r in top20_returns]
    
    fig.add_trace(
        go.Bar(
            x=top20_labels,
            y=top20_returns,
            marker_color=colors,
            name="Return %",
            hovertemplate="%{x}<br>Return: %{y:.1f}%<extra></extra>"
        ),
        row=1, col=2
    )
    
    # Лучший equity curve - запускаем полный бэктест
    best_atr = int(best["atr_len"])
    best_factor = float(best["factor"])
    
    direction = supertrend(df_price, best_atr, best_factor)
    dchg = direction.diff()
    long_sig = (dchg < 0).fillna(False)
    short_sig = (dchg > 0).fillna(False)
    
    equity = INITIAL_CAPITAL
    pos = 0
    entry_price = 0.0
    qty = 0
    equity_curve = []
    
    def units(eq, px):
        budget = eq * (POSITION_PCT / 100.0)
        return int(np.floor(budget / px)) if px > 0 else 0
    
    for i in range(1, len(df_price)):
        px = float(df_price["close"].iloc[i])
        
        if pos != 0:
            if (pos == 1 and short_sig.iloc[i]) or (pos == -1 and long_sig.iloc[i]):
                pnl = (px - entry_price) * pos * qty
                equity += pnl
                pos = 0
                entry_price = 0.0
                qty = 0
        
        if pos == 0:
            if long_sig.iloc[i]:
                q = units(equity, px)
                if q > 0:
                    pos = 1
                    qty = q
                    entry_price = px
            elif short_sig.iloc[i]:
                q = units(equity, px)
                if q > 0:
                    pos = -1
                    qty = q
                    entry_price = px
        
        mtm = equity
        if pos != 0 and qty > 0:
            mtm = equity + (px - entry_price) * pos * qty
        equity_curve.append((df_price.index[i], mtm))
    
    eq_dates = [x[0] for x in equity_curve]
    eq_values = [x[1] for x in equity_curve]
    
    fig.add_trace(
        go.Scatter(x=eq_dates, y=eq_values, name="Equity", line=dict(color="blue")),
        row=2, col=1
    )
    
    # Price chart
    fig.add_trace(
        go.Candlestick(
            x=df_price.index,
            open=df_price["open"],
            high=df_price["high"],
            low=df_price["low"],
            close=df_price["close"],
            name="NG"
        ),
        row=2, col=2
    )
    
    fig.update_layout(
        height=900,
        title_text=f"MOEX NG Supertrend Optimization Results<br>Best: ATR={best_atr}, Factor={best_factor:.2f}, Return={best['total_return']*100:.1f}%",
        showlegend=False
    )
    
    fig.update_xaxes(title_text="Factor", row=1, col=1)
    fig.update_yaxes(title_text="ATR Length", row=1, col=1)
    fig.update_xaxes(tickangle=45, row=1, col=2)
    fig.update_xaxes(rangeslider_visible=False, row=2, col=2)
    
    # Форматируем таблицу топ-20
    top20_display = top20.copy()
    top20_display["total_return"] = (top20_display["total_return"] * 100).round(2).astype(str) + "%"
    top20_display["max_drawdown"] = (top20_display["max_drawdown"] * 100).round(2).astype(str) + "%"
    top20_display["final_capital"] = top20_display["final_capital"].round(2)
    top20_display["sharpe"] = top20_display["sharpe"].round(2)
    top20_display["winrate"] = (top20_display["winrate"] * 100).round(1).astype(str) + "%"
    top20_display.columns = ["ATR Len", "Factor", "Final $", "Return", "Max DD", "Trades", "Sharpe", "Winrate"]
    
    # Статистика по всем результатам
    profitable = (results_df["total_return"] > 0).sum()
    total_combos = len(results_df)
    avg_return = results_df["total_return"].mean() * 100
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>MOEX NG Supertrend Optimization</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
            .container {{ max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            h1 {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
            h2 {{ color: #34495e; }}
            .best-params {{ background: #27ae60; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .best-params h2 {{ color: white; margin-top: 0; }}
            .stats {{ display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }}
            .stat-box {{ background: #ecf0f1; padding: 15px; border-radius: 8px; min-width: 150px; }}
            .stat-box .value {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
            .stat-box .label {{ color: #7f8c8d; font-size: 12px; }}
            table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
            th, td {{ border: 1px solid #bdc3c7; padding: 10px; text-align: right; }}
            th {{ background: #3498db; color: white; }}
            tr:nth-child(even) {{ background: #f9f9f9; }}
            tr:hover {{ background: #e8f4f8; }}
            .positive {{ color: #27ae60; font-weight: bold; }}
            .negative {{ color: #e74c3c; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔍 MOEX NG Supertrend — Оптимизация параметров</h1>
            
            <div class="best-params">
                <h2>✅ Лучшие параметры</h2>
                <p style="font-size: 24px; margin: 10px 0;">
                    <strong>ATR Length:</strong> {best_atr} &nbsp;&nbsp;|&nbsp;&nbsp;
                    <strong>Factor:</strong> {best_factor:.2f}
                </p>
                <p style="font-size: 18px;">
                    Финальный капитал: <strong>${best['final_capital']:,.2f}</strong> &nbsp;|&nbsp;
                    Доходность: <strong>{best['total_return']*100:.1f}%</strong> &nbsp;|&nbsp;
                    Max DD: <strong>{best['max_drawdown']*100:.1f}%</strong> &nbsp;|&nbsp;
                    Сделок: <strong>{int(best['trades'])}</strong>
                </p>
            </div>
            
            <div class="stats">
                <div class="stat-box">
                    <div class="value">{total_combos}</div>
                    <div class="label">Всего комбинаций</div>
                </div>
                <div class="stat-box">
                    <div class="value">{profitable}</div>
                    <div class="label">Прибыльных ({100*profitable/total_combos:.1f}%)</div>
                </div>
                <div class="stat-box">
                    <div class="value">{avg_return:.1f}%</div>
                    <div class="label">Средняя доходность</div>
                </div>
                <div class="stat-box">
                    <div class="value">{len(df_price)}</div>
                    <div class="label">Баров данных</div>
                </div>
            </div>
            
            <h2>📊 Визуализация</h2>
            {fig.to_html(full_html=False, include_plotlyjs="cdn")}
            
            <h2>🏆 Топ-20 лучших комбинаций</h2>
            {top20_display.to_html(index=False, classes="top20-table")}
            
            <h2>📋 Параметры тестирования</h2>
            <ul>
                <li>Период: {START_DATE} → {END_DATE}</li>
                <li>ATR Length: {min(ATR_LEN_RANGE)} - {max(ATR_LEN_RANGE)}</li>
                <li>Factor: {min(ATR_FACTOR_RANGE):.2f} - {max(ATR_FACTOR_RANGE):.2f}</li>
                <li>Начальный капитал: ${INITIAL_CAPITAL:,.0f}</li>
                <li>Размер позиции: {POSITION_PCT}%</li>
            </ul>
        </div>
    </body>
    </html>
    """
    
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(html)

# =========================
# MAIN
# =========================
def main():
    print("=" * 60)
    print("MOEX NG SUPERTREND — ОПТИМИЗАЦИЯ ПАРАМЕТРОВ")
    print("=" * 60)
    
    print("\n[INFO] Загрузка данных NG...")
    df = build_continuous_ng()
    print(f"[INFO] Загружено баров: {len(df)} | {df.index.min()} -> {df.index.max()}")
    
    print("\n[INFO] Запуск оптимизации...")
    results = optimize(df)
    
    print("\n[INFO] Генерация отчёта...")
    make_optimization_report(df, results)
    
    # Лучший результат
    best = results.sort_values("final_capital", ascending=False).iloc[0]
    
    print("\n" + "=" * 60)
    print("РЕЗУЛЬТАТЫ ОПТИМИЗАЦИИ")
    print("=" * 60)
    print(f"\n✅ ЛУЧШИЕ ПАРАМЕТРЫ:")
    print(f"   ATR Length: {int(best['atr_len'])}")
    print(f"   Factor:     {best['factor']:.2f}")
    print(f"\n📊 МЕТРИКИ:")
    print(f"   Финальный капитал: ${best['final_capital']:,.2f}")
    print(f"   Доходность:        {best['total_return']*100:.1f}%")
    print(f"   Max Drawdown:      {best['max_drawdown']*100:.1f}%")
    print(f"   Sharpe:            {best['sharpe']:.2f}")
    print(f"   Сделок:            {int(best['trades'])}")
    print(f"   Winrate:           {best['winrate']*100:.1f}%")
    
    # Топ-5
    print(f"\n🏆 ТОП-5 КОМБИНАЦИЙ:")
    top5 = results.sort_values("final_capital", ascending=False).head(5)
    for i, (_, row) in enumerate(top5.iterrows(), 1):
        print(f"   {i}. ATR={int(row['atr_len'])}, F={row['factor']:.2f} → ${row['final_capital']:,.2f} ({row['total_return']*100:+.1f}%)")
    
    print(f"\n[OK] Отчёт сохранён: {REPORT_PATH}")

if __name__ == "__main__":
    main()
