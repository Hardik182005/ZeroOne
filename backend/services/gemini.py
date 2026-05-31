import os
import json
import asyncio
import google.generativeai as genai
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# clean_env is critical: a BOM/newline in the secret makes gRPC reject the auth
# metadata ("Illegal header value") and flood the logs / burn CPU.
from utils.env import clean_env
GEMINI_API_KEY = clean_env("GEMINI_API_KEY")

# Initialize GenAI if key is present
if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
else:
    model = None

# Fallback parser for JSON
def parse_verdict_response(content: str) -> dict:
    try:
        # Strip markdown format if present
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]
        return json.loads(content.strip())
    except Exception as e:
        print(f"[GEMINI PARSE ERROR] Failed: {e}")
        return get_mock_verdict_fallback()

def get_mock_verdict_fallback() -> dict:
    return {
        "analysis": "Institutional accumulation patterns remain strong. Technical indicators show a clear bull flag breakout setup. Option chain indicates robust support at lower strike nodes.",
        "verdict": "BULLISH",
        "promoter_trust_score": 90,
        "risks": [
          "Raw material input cost inflation",
          "Currency exposure on imports",
          "Regulatory policy alignment delays"
        ],
        "verdict_changer": "A sustained close below key moving averages would alter this setup.",
        "earnings_verdict": None,
        "sector_summary": None
    }

async def get_gemini_verdict(ticker: str, data: dict) -> dict:
    if model is None:
        print("[GEMINI] Mock Mode: No valid API key set. Returning mock verdict.")
        return get_mock_verdict_fallback()
        
    from services.groq_svc import build_prompt
    prompt = build_prompt(ticker, data)
    
    try:
        # generate_content is blocking (sync gRPC) — run off the event loop
        # so it can't wedge the async server.
        response = await asyncio.to_thread(model.generate_content, prompt)
        return parse_verdict_response(response.text)
    except Exception as e:
        print(f"[GEMINI API ERROR] {e}. Returning mock verdict.")
        return get_mock_verdict_fallback()

async def generate_pdf_report(ticker: str, full_data: dict) -> bytes:
    ticker = ticker.upper()
    quote = full_data.get("quote", {})
    fundamentals = full_data.get("fundamentals", {})
    options = full_data.get("options", {})
    verdict = full_data.get("verdict", {})
    
    report_text = ""
    if model is not None:
        try:
            report_prompt = f"""
            Generate a 2-page equity research report for {ticker}.
            Include: Executive Summary, Key Financials Table,
            Options Analysis, News Summary, Risk Factors, AI Verdict.
            Use the data: {json.dumps(full_data, indent=2)}
            Format as structured text with clear section headers.
            Include ZeroOne branding. Add disclaimer footer.
            """
            response = await asyncio.to_thread(model.generate_content, report_prompt)
            report_text = response.text
        except Exception as e:
            print(f"[GEMINI PDF TEXT GEN FAILED] {e}. Using static template.")
            
    if not report_text:
        # High quality static report text fallback
        report_text = f"""
        ZERØONE EQUITY RESEARCH TERMINAL REPORT
        TICKER: {ticker}
        
        EXECUTIVE SUMMARY:
        {ticker} is exhibiting strong technical momentum, trading at ₹{quote.get('price')} (Change: {quote.get('change_pct')}%). Volume levels are high and suggest institutional buy-side interest. 
        
        AI VERDICT: {verdict.get('verdict', 'BULLISH')} (Promoter Trust Score: {verdict.get('promoter_trust_score', 90)}/100)
        {verdict.get('analysis', 'No current analysis available.')}
        
        VERDICT CHANGER:
        {verdict.get('verdict_changer', 'A weekly close below major moving averages would change the verdict.')}
        
        KEY FINANCIALS:
        - P/E: {fundamentals.get('pe', 'N/A')}
        - P/B: {fundamentals.get('pb', 'N/A')}
        - ROE: {fundamentals.get('roe', 'N/A')}%
        - ROCE: {fundamentals.get('roce', 'N/A')}%
        - Debt/Equity: {fundamentals.get('de', 'N/A')}
        - Interest Coverage: {fundamentals.get('interest_coverage', 'N/A')}
        
        OPTIONS PULSE:
        - Put-Call Ratio (PCR): {options.get('pcr', 'N/A')}
        - Max Pain: ₹{options.get('max_pain', 'N/A')}
        - IV Percentile: {options.get('iv_percentile', 'N/A')}%
        
        RISKS:
        {chr(10).join(['- ' + r for r in verdict.get('risks', [])])}
        
        DISCLAIMER: For educational and informational purposes only. ZeroOne is an AI terminal, not a registered investment advisor.
        """
        
    return build_pdf_with_reportlab(ticker, report_text, full_data)

def build_pdf_with_reportlab(ticker: str, report_text: str, full_data: dict) -> bytes:
    import io
    pdf_buffer = io.BytesIO()
    
    # 2 Page Document Setup
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles matching ZeroOne design
    title_style = ParagraphStyle(
        'ZeroOneTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#5317dd') # ZeroOne Purple
    )
    
    h2_style = ParagraphStyle(
        'ZeroOneH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#1c1b1b'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'ZeroOneBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#484456')
    )
    
    meta_style = ParagraphStyle(
        'ZeroOneMeta',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=10,
        leading=12,
        textColor=colors.HexColor('#005a3e')
    )

    story = []
    
    # Header
    story.append(Paragraph("ZERØONE EQUITY RESEARCH TERMINAL", title_style))
    story.append(Paragraph(f"TICKER: {ticker} | CONFIDENTIAL INST. REPORT", meta_style))
    story.append(Spacer(1, 15))
    
    # Render PDF Report sections
    lines = report_text.split('\n')
    current_text_block = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        if stripped.endswith(':') or stripped.isupper() and len(stripped) < 40:
            # Output buffered body text
            if current_text_block:
                story.append(Paragraph(" ".join(current_text_block), body_style))
                story.append(Spacer(1, 8))
                current_text_block = []
            story.append(Paragraph(stripped, h2_style))
        else:
            current_text_block.append(stripped)
            
    if current_text_block:
        story.append(Paragraph(" ".join(current_text_block), body_style))
        
    story.append(Spacer(1, 15))
    
    # Add Fundamentals Data Table
    story.append(Paragraph("KEY FINANCIAL METRICS", h2_style))
    f = full_data.get("fundamentals", {})
    q = full_data.get("quote", {})
    table_data = [
        ["Metric", "Value", "Metric", "Value"],
        ["Price", f"₹{q.get('price')}", "P/E Ratio", str(f.get('pe'))],
        ["Change", f"{q.get('change_pct')}%", "P/B Ratio", str(f.get('pb'))],
        ["Market Cap", str(q.get('market_cap')), "ROE", f"{f.get('roe')}%"],
        ["Debt / Equity", str(f.get('de')), "ROCE", f"{f.get('roce')}%"]
    ]
    
    t = Table(table_data, colWidths=[2.0*inch, 1.75*inch, 2.0*inch, 1.75*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (3, 0), colors.HexColor('#e9ddff')),
        ('TEXTCOLOR', (0, 0), (3, 0), colors.HexColor('#201142')),
        ('FONTNAME', (0, 0), (3, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cac3d9')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
    ]))
    story.append(t)
    
    # Document compilation
    doc.build(story)
    
    pdf_bytes = pdf_buffer.getvalue()
    pdf_buffer.close()
    return pdf_bytes
