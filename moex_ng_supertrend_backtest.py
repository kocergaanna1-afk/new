# ============================================================
# NATURAL GAS (MOEX NG) BACKTEST — SUPERTRAND ATR
# FIXED: groupby mean only numeric OHLCV (secid excluded)
# ============================================================

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timezone
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# =========================
# CONFIG
# =========================
BASE = "NG"
START_DATE = "2020-01-31"
END_DATE = datetime.now(timezone.utc).strftime("%Y-%m-%d")
INTERVAL = 24

ATR_LEN = 10
ATR_FACTOR = 0.14

INITIAL_CAPITAL = 10_000.0
POSITION_PCT = 100.0  # 100% капитала

REPORT_PATH = "moex_ng_supertrend_ATR10_F0p14_report.html"

# =========================
# MOEX HELPERS
# =========================
def iss_get(url, params=None):
    r = requests.get(url, params=params or {}, timeout=30)
    r.raise_for_status()
    return r.json()

def get_ng_contracts():
    """
    Ищем фьючерсы NG на MOEX (FORTS). Берём только те, что выглядят как NGZ5, NGF6, ...
    """
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
    df = df[df["secid"].str.match(r"^NG[A-Z]\d$", na=False)].copy()  # NGZ5, NGF6 и т.п.
    df = df.sort_values("secid").reset_index(drop=True)
    return df

def load_candles(secid):
    """
    Качаем дневные свечи по конкретному контракту
    """
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

# =========================
# CONTINUOUS SERIES (simple blend)
# =========================
def build_continuous_ng(min_bars_per_contract=50):
    contracts = get_ng_contracts()
    if contracts.empty:
        raise ValueError("No NG futures found (futures_forts/RFUD)")

    series = []
    for secid in contracts["secid"].tolist():
        try:
            df = load_candles(secid)
            if df.empty:
                continue
            if len(df) < min_bars_per_contract:
                continue

            df = df[["open","high","low","close","volume"]].copy()
            df["secid"] = secid  # оставим для отладки, но НЕ будем усреднять
            series.append(df)
        except Exception:
            continue

    if not series:
        raise ValueError("NG contracts loaded = 0 (no candles).")

    df_all = pd.concat(series).sort_index()

    # !!! FIX: mean только по числовым колонкам !!!
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

    st = pd.Series(index=df.index, dtype=float)
    direction = pd.Series(index=df.index, dtype=int)  # +1 up, -1 down
    direction.iloc[0] = 0
    st.iloc[0] = np.nan

    for i in range(1, len(df)):
        c = df["close"].iloc[i]
        prev_dir = direction.iloc[i-1]

        if prev_dir == 0:
            if c <= upper.iloc[i]:
                direction.iloc[i] = -1
                st.iloc[i] = upper.iloc[i]
            else:
                direction.iloc[i] = +1
                st.iloc[i] = lower.iloc[i]
            continue

        if prev_dir == +1:
            if c < lower.iloc[i]:
                direction.iloc[i] = -1
                st.iloc[i] = upper.iloc[i]
            else:
                direction.iloc[i] = +1
                st.iloc[i] = lower.iloc[i]
        else:
            if c > upper.iloc[i]:
                direction.iloc[i] = +1
                st.iloc[i] = lower.iloc[i]
            else:
                direction.iloc[i] = -1
                st.iloc[i] = upper.iloc[i]

    return st, direction

# =========================
# BACKTEST (spot-like sizing)
# =========================
def backtest(df):
    st_line, direction = supertrend(df, ATR_LEN, ATR_FACTOR)
    dchg = direction.diff()

    long_sig = (dchg < 0).fillna(False)
    short_sig = (dchg > 0).fillna(False)

    equity = INITIAL_CAPITAL
    pos = 0
    entry_price = np.nan
    entry_time = None
    qty = 0

    equity_curve = []
    trades = []

    def units(eq, px):
        budget = eq * (POSITION_PCT / 100.0)
        return int(np.floor(budget / px)) if px > 0 else 0

    for i in range(1, len(df)):
        ts = df.index[i]
        px = float(df["close"].iloc[i])

        # reverse/exit
        if pos != 0:
            if (pos == 1 and short_sig.iloc[i]) or (pos == -1 and long_sig.iloc[i]):
                pnl = (px - entry_price) * pos * qty
                equity += pnl

                trades.append({
                    "side": "LONG" if pos == 1 else "SHORT",
                    "entry_time": entry_time,
                    "exit_time": ts,
                    "qty": qty,
                    "entry_price": entry_price,
                    "exit_price": px,
                    "pnl_usd": pnl,
                    "pnl_pct": (equity / INITIAL_CAPITAL - 1.0)
                })

                pos = 0
                entry_price = np.nan
                entry_time = None
                qty = 0

        # entry
        if pos == 0:
            if long_sig.iloc[i]:
                q = units(equity, px)
                if q > 0:
                    pos = 1
                    qty = q
                    entry_price = px
                    entry_time = ts
            elif short_sig.iloc[i]:
                q = units(equity, px)
                if q > 0:
                    pos = -1
                    qty = q
                    entry_price = px
                    entry_time = ts

        # mark-to-market
        mtm = equity
        if pos != 0 and qty > 0:
            mtm = equity + (px - entry_price) * pos * qty

        equity_curve.append((ts, mtm))

    eq = pd.Series([x[1] for x in equity_curve], index=[x[0] for x in equity_curve], name="equity")
    trades_df = pd.DataFrame(trades)
    return eq, trades_df, float(eq.iloc[-1]) if len(eq) else equity

# =========================
# METRICS + REPORT
# =========================
def compute_metrics(eq, trades):
    rets = eq.pct_change().dropna()
    total_return = eq.iloc[-1] / eq.iloc[0] - 1 if len(eq) else 0.0

    peak = eq.cummax()
    dd = eq / peak - 1
    max_dd = float(dd.min()) if len(dd) else 0.0

    sharpe = float(rets.mean() / rets.std() * np.sqrt(252)) if len(rets) and rets.std() > 0 else np.nan

    if trades.empty:
        winrate = np.nan
    else:
        winrate = float((trades["pnl_usd"] > 0).mean())

    return {
        "Final Capital": float(eq.iloc[-1]) if len(eq) else float(INITIAL_CAPITAL),
        "Total Return": float(total_return),
        "Max Drawdown": float(max_dd),
        "Sharpe (daily)": sharpe,
        "Trades": int(len(trades)),
        "Winrate": winrate
    }

def make_report(df, eq, trades, metrics):
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                        subplot_titles=("Equity Curve", "Price (continuous)"))

    fig.add_trace(go.Scatter(x=eq.index, y=eq.values, name="Equity"), row=1, col=1)

    fig.add_trace(go.Candlestick(
        x=df.index,
        open=df["open"], high=df["high"], low=df["low"], close=df["close"],
        name="NG"
    ), row=2, col=1)

    m = pd.DataFrame([{"Metric": k, "Value": v} for k, v in metrics.items()])
    t = trades.copy()
    if not t.empty:
        t["entry_time"] = t["entry_time"].astype(str)
        t["exit_time"] = t["exit_time"].astype(str)

    html = f"""
    <h1>MOEX NG Supertrend Backtest</h1>
    <h2>Final capital: ${metrics['Final Capital']:,.2f}</h2>
    <h3>Params</h3>
    <ul>
      <li>Period: {START_DATE} → {END_DATE} (1D)</li>
      <li>ATR_LEN: {ATR_LEN}</li>
      <li>Factor: {ATR_FACTOR}</li>
      <li>Initial capital: {INITIAL_CAPITAL}</li>
      <li>Position size: {POSITION_PCT}%</li>
    </ul>
    <h3>Metrics</h3>
    {m.to_html(index=False)}
    <h3>Charts</h3>
    {fig.to_html(full_html=False, include_plotlyjs="cdn")}
    <h3>Trades</h3>
    {("<p>No trades</p>" if t.empty else t.to_html(index=False))}
    """

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(html)

# =========================
# MAIN
# =========================
def main():
    print("[INFO] Building NG continuous series...")
    df = build_continuous_ng()
    print("[INFO] Bars:", len(df), "|", df.index.min(), "->", df.index.max())

    eq, trades, final_cap = backtest(df)
    metrics = compute_metrics(eq, trades)

    make_report(df, eq, trades, metrics)

    print("[OK] HTML report saved:", REPORT_PATH)
    print("[OK] Final capital:", round(metrics["Final Capital"], 2))

if __name__ == "__main__":
    main()
