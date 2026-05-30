import asyncio
import httpx
from main import app

async def test_endpoints():
    print("Starting ZeroOne API Integration Tests...")
    
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        # 1. Health check
        print("Testing GET /api/health...")
        res = await client.get("/api/health")
        assert res.status_code == 200
        print("✓ Health check OK:", res.json())

        # 2. Search symbols
        print("Testing GET /api/tickers/search...")
        res = await client.get("/api/tickers/search?q=reliance")
        assert res.status_code == 200
        assert len(res.json()) > 0
        print("✓ Search OK:", res.json()[0])

        # 3. Main Stock intelligence (POST)
        print("Testing POST /api/stock/RELIANCE...")
        res = await client.post("/api/stock/RELIANCE")
        assert res.status_code == 200
        data = res.json()
        assert data["ticker"] == "RELIANCE"
        assert "verdict" in data
        print("✓ Stock intelligence OK. AI Verdict:", data["verdict"]["verdict"])

        # 4. Sectors flow
        print("Testing GET /api/sectors...")
        res = await client.get("/api/sectors")
        assert res.status_code == 200
        sectors_data = res.json()
        assert "sectors" in sectors_data
        assert len(sectors_data["sectors"]) > 0
        print("✓ Sectors rotation flow OK")

        # 5. Dual stock comparison (POST)
        print("Testing POST /api/compare...")
        res = await client.post("/api/compare", json={"ticker1": "RELIANCE", "ticker2": "INFY"})
        assert res.status_code == 200
        comp_data = res.json()
        assert "overall_winner" in comp_data
        print("✓ Stock comparison OK. Winner:", comp_data["overall_winner"])

        # 6. Single Voice Narration stream (POST)
        print("Testing POST /api/voice/RELIANCE...")
        res = await client.post("/api/voice/RELIANCE")
        assert res.status_code == 200
        assert res.headers["content-type"] == "audio/mpeg"
        print("✓ Voice narration OK. Audio size:", len(res.content), "bytes")

        # 7. Morning Briefing stream (POST)
        print("Testing POST /api/briefing...")
        res = await client.post("/api/briefing", json={"tickers": ["RELIANCE", "INFY"]})
        assert res.status_code == 200
        assert res.headers["content-type"] == "audio/mpeg"
        print("✓ Morning briefing OK. Audio size:", len(res.content), "bytes")

        # 8. Download PDF Report (GET)
        print("Testing GET /api/pdf/RELIANCE...")
        res = await client.get("/api/pdf/RELIANCE")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        print("✓ PDF Report download OK. PDF size:", len(res.content), "bytes")

        # 9. Ticker tape data (GET)
        print("Testing GET /api/ticker-tape...")
        res = await client.get("/api/ticker-tape")
        assert res.status_code == 200
        print("✓ Ticker tape OK")

        # 10. Market status (GET)
        print("Testing GET /api/market-status...")
        res = await client.get("/api/market-status")
        assert res.status_code == 200
        print("✓ Market status OK:", res.json())

    print("\nAll integration tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
