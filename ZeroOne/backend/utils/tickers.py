TICKERS = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Limited"},
    {"symbol": "TCS", "name": "Tata Consultancy Services Limited"},
    {"symbol": "INFY", "name": "Infosys Limited"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Limited"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Limited"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Limited"},
    {"symbol": "SBI", "name": "State Bank of India"},
    {"symbol": "ITC", "name": "ITC Limited"},
    {"symbol": "LICI", "name": "Life Insurance Corporation of India"},
    {"symbol": "LT", "name": "Larsen & Toubro Limited"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Limited"},
    {"symbol": "AXISBANK", "name": "Axis Bank Limited"},
    {"symbol": "HCLTECH", "name": "HCL Technologies Limited"},
    {"symbol": "MARUTI", "name": "Maruti Suzuki India Limited"},
    {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries Limited"},
    {"symbol": "ADANIENT", "name": "Adani Enterprises Limited"},
    {"symbol": "ADANIPORTS", "name": "Adani Ports and Special Economic Zone Limited"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Limited"},
    {"symbol": "TATASTEEL", "name": "Tata Steel Limited"},
    {"symbol": "ULTRACEMCO", "name": "UltraTech Cement Limited"},
    {"symbol": "NTPC", "name": "NTPC Limited"},
    {"symbol": "POWERGRID", "name": "Power Grid Corporation of India Limited"},
    {"symbol": "ONGC", "name": "Oil and Natural Gas Corporation Limited"},
    {"symbol": "COALINDIA", "name": "Coal India Limited"},
    {"symbol": "ASIANPAINT", "name": "Asian Paints Limited"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance Limited"},
    {"symbol": "BAJAJFINSV", "name": "Bajaj Finserv Limited"},
    {"symbol": "TITAN", "name": "Titan Company Limited"},
    {"symbol": "JIOFIN", "name": "Jio Financial Services Limited"},
    {"symbol": "M&M", "name": "Mahindra & Mahindra Limited"},
    {"symbol": "JSWSTEEL", "name": "JSW Steel Limited"},
    {"symbol": "JINDALSTEL", "name": "Jindal Steel & Power Limited"},
    {"symbol": "BPCL", "name": "Bharat Petroleum Corporation Limited"},
    {"symbol": "WIPRO", "name": "Wipro Limited"},
    {"symbol": "NESTLEIND", "name": "Nestle India Limited"},
    {"symbol": "DLF", "name": "DLF Limited"},
    {"symbol": "ZEEL", "name": "Zee Entertainment Enterprises Limited"},
    {"symbol": "TATACOMM", "name": "Tata Communications Limited"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Limited"},
    {"symbol": "GRASIM", "name": "Grasim Industries Limited"},
    {"symbol": "HINDALCO", "name": "Hindalco Industries Limited"},
    {"symbol": "ADANIPOWER", "name": "Adani Power Limited"},
    {"symbol": "HAL", "name": "Hindustan Aeronautics Limited"},
    {"symbol": "BEL", "name": "Bharat Electronics Limited"},
    {"symbol": "IOC", "name": "Indian Oil Corporation Limited"},
    {"symbol": "GAIL", "name": "GAIL (India) Limited"},
    {"symbol": "REC", "name": "REC Limited"},
    {"symbol": "PFC", "name": "Power Finance Corporation Limited"}
]

def get_company_name(ticker: str) -> str:
    t = ticker.upper()
    for item in TICKERS:
        if item["symbol"] == t:
            return item["name"]
    return f"{t} India Limited"

def search_tickers_local(query: str) -> list:
    if not query or len(query) < 1:
        return []
    q = query.upper()
    ql = query.lower()
    results = []
    for item in TICKERS:
        if q in item["symbol"] or ql in item["name"].lower():
            results.append({"symbol": item["symbol"], "name": item["name"]})
    return results[:10]
