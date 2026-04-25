from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import streamlit as st

st.set_page_config(
    page_title="AI Outreach Assistant",
    page_icon=":speech_balloon:",
    layout="wide",
)

# Guard against missing dependencies to provide clear user instructions
def check_critical_dependencies():
    missing = []
    try:
        import extra_streamlit_components
    except ImportError:
        missing.append("extra-streamlit-components")
    try:
        import jwt
    except ImportError:
        missing.append("PyJWT")
        
    if missing:
        st.error(f"### ⚠️ Missing Required Libraries: {', '.join(missing)}")
        st.info("The application cannot start correctly without these libraries.")
        cmds = "\n".join([f"pip install {lib}" for lib in missing])
        st.markdown(f"To fix this, please run these commands in your terminal:\n```bash\n{cmds}\n```\nThen, restart the app.")
        st.stop()

check_critical_dependencies()

import extra_streamlit_components as stx
import jwt

# AI provider dependencies are checked lazily.

from streamlit_src.config import get_settings
from streamlit_src.database import Database
from streamlit_src.security import (
    decrypt_api_key,
    encrypt_api_key,
    hash_password,
    sanitize_api_key,
    verify_password,
)

# --- UI BEAUTIFICATION & CSS ---
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* FORCE GLOBAL THEME */
    html, body, [data-testid="stAppViewContainer"], .main {
        background-color: #0a0a0f !important;
        color: #ffffff !important;
        font-family: 'Inter', -apple-system, sans-serif;
        overflow: auto !important;
    }

    /* --- MODERN DARK SAAS THEME --- */
    html, body, [data-testid="stAppViewContainer"], .main, .stApp {
        background-color: #0a0a0f !important;
        color: #ffffff !important;
        font-family: 'Inter', -apple-system, sans-serif;
    }
    
    /* --- GLOBAL TEXT VISIBILITY --- */
    h1, h2, h3, h4, h5, h6, .stTitle, .stHeader, label, p, span, .stMarkdown, .stText, .stCaption, 
    [data-testid="stWidgetLabel"] p, [data-testid="stMarkdownContainer"] p,
    .stSelectbox label, .stTextInput label, .stTextArea label {
        color: #ffffff !important;
    }

    /* Aggressive Input Field Styling */
    input, textarea, [data-baseweb="select"] > div, [data-testid="stChatInput"] textarea {
        background-color: #161b22 !important;
        color: #ffffff !important;
        border: 1px solid #30363d !important;
        border-radius: 8px !important;
    }

    /* Force Selectbox options to be visible */
    div[data-baseweb="popover"] *, div[data-baseweb="select"] * {
        color: #ffffff !important;
    }

    /* Global Selection */
    ::selection {
        background-color: #ff8c00 !important;
        color: #000000 !important;
    }

    /* Scrollbar Styling */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #ff8c00 !important; }

    /* Sidebar & Chat List */
    [data-testid="stSidebar"] {
        background-color: #161b22 !important;
        border-right: 1px solid #30363d;
    }

    [data-testid="stVerticalBlock"] > div:has(button[key^="chat_"]):hover {
        background-color: rgba(255, 140, 0, 0.15) !important;
    }
    /* Sidebar Button Text - Force Black */
    [data-testid="stSidebar"] .stButton > button,
    [data-testid="stSidebar"] .stButton > button p,
    .stButton > button p,
    .stButton > button {
        color: #000000 !important;
        font-weight: 600 !important;
    }

    /* --- BUTTONS: NEON ORANGE THEME --- */
    .stButton > button, div[data-testid="stFormSubmitButton"] > button {
        background-color: #ff8c00 !important;
        color: #000000 !important;
        border-radius: 14px !important;
        border: none !important;
        transition: all 0.25s ease !important;
        font-weight: 700 !important;
        width: 100%;
        box-shadow: 0 8px 24px rgba(0,0,0,0.22) !important;
        cursor: pointer !important;
        padding: 0.95rem 1rem !important;
    }
    button, input, textarea, select {
        transition: all 0.25s ease !important;
    }
    button:hover, button:focus, input:hover, textarea:hover, select:hover {
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.18) !important;
    }
    
    .stButton > button:hover, .stButton > button:active, [data-baseweb="tab"]:hover {
        background-color: #adff2f !important;
        color: #000000 !important;
        box-shadow: 0 6px 20px rgba(173, 255, 47, 0.35) !important;
        border: none !important;
        transform: translateY(-1px) !important;
    }

    /* Selectbox dropdown background and text */
    [data-baseweb="select"] > div { /* Main selectbox display area */
        background-color: #161b22 !important; /* Keep it dark */
        color: #ffffff !important; /* White text for the selected item */
        border: 1px solid #30363d !important;
    }
    
    /* Selectbox dropdown (popover) styling */
    div[data-baseweb="popover"] {
        background-color: #1f2937 !important; /* Darker background */
        border: 1px solid #30363d !important;
    }
    div[data-baseweb="popover"] li {
        color: #ffffff !important; /* White text */
        padding: 8px 12px;
    }
    div[data-baseweb="popover"] li:hover {
        background-color: #ff8c00 !important; /* Orange on hover */
        color: #000000 !important;
    }
    div[data-baseweb="popover"] * { /* Ensure all text inside popover is white */
        color: #ffffff !important;
    }

    /* --- TOP HEADER STYLING (Deploy & Menu) --- */
    header[data-testid="stHeader"] {
        background-color: #000000 !important; /* Black header bar */
    }
    header[data-testid="stHeader"] * {
        color: #ff8c00 !important; /* Orange text and icons */
    }
    header[data-testid="stHeader"] *:hover {
        color: #adff2f !important; /* Green on hover */
    }
    header[data-testid="stHeader"] button { background: transparent !important; }

    /* Hide "Press Enter to submit" helper text */
    div[data-testid="stFormSubmitButton"] small {
        display: none !important;
    }

    /* Forms & Cards */
    [data-testid="stForm"] {
        background-color: #1f2937 !important;
        border: 2px solid #30363d !important;
        border-radius: 16px !important;
        padding: 2.5rem !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    }
    [data-testid="stForm"]:hover {
        border-color: #ff8c00 !important; 
        box-shadow: 0 20px 50px rgba(255, 140, 0, 0.15) !important;
        transform: translateY(-4px) !important;
    }

    /* Prompt Box with Scroll */
    [data-testid="stChatInput"] {
        border: 1px solid #30363d !important;
        border-radius: 12px !important;
        background-color: #161b22 !important;
    }
    [data-testid="stChatInput"] textarea {
        max-height: 200px !important;
        overflow-y: auto !important;
        color: #ffffff !important;
    }
    [data-testid="stChatInput"]:hover {
        border-color: #adff2f !important;
    }

    /* Chat Bubbles */
    [data-testid="stChatMessage"] {
        border-radius: 12px !important;
        margin-bottom: 1rem !important;
        background-color: #1f2937 !important;
        border: 1px solid #30363d !important;
        color: #ffffff !important;
        padding: 1rem !important;
    }
    [data-testid="stChatMessage"]:nth-child(odd) { border-left: 4px solid #58a6ff !important; }
    [data-testid="stChatMessage"]:nth-child(even) { border-left: 4px solid #ff8c00 !important; }

    /* --- AUTH SCREEN ENHANCEMENTS --- */
    .auth-header {
        text-align: center !important;
        margin-bottom: 2.5rem !important;
        padding: 2.5rem !important;
        background-color: #1f2937 !important;
        border-radius: 24px !important;
        border: 1px solid #30363d !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
    }
    .auth-header h1 {
        font-size: 3.8rem !important;
        color: #ff8c00 !important;
        margin-bottom: 0.5rem !important;
        font-weight: 800 !important;
    }
    .auth-header p {
        color: #cbd5e1 !important;
        font-size: 1.3rem !important;
        font-weight: 500 !important;
    }

    [data-baseweb="tab-list"] {
        justify-content: center !important;
        gap: 25px !important;
    }
    [data-baseweb="tab"] {
        font-weight: 600 !important;
        font-size: 1.1rem !important;
        color: #8b949e !important;
        transition: all 0.3s ease !important;
    }
    [data-baseweb="tab"]:hover { color: #adff2f !important; }
    [data-baseweb="tab"][aria-selected="true"] {
        color: #ffffff !important;
        border-bottom-color: #ff8c00 !important; 
    }

    .ui-card, .panel-card, .project-card, .dashboard-action-card {
        background: linear-gradient(180deg, #111827 0%, #161b22 100%) !important;
        border: 1px solid rgba(255,140,0,0.18) !important;
        border-radius: 22px !important;
        padding: 1.75rem !important;
        box-shadow: 0 24px 70px rgba(0,0,0,0.28) !important;
        transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease !important;
    }
    .ui-card:hover, .panel-card:hover, .project-card:hover, .dashboard-action-card:hover, .chat-panel:hover {
        transform: translateY(-4px) !important;
        border-color: #ff8c00 !important;
        box-shadow: 0 28px 90px rgba(255,140,0,0.18) !important;
    }
    .dashboard-summary-grid {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 1rem !important;
        margin-bottom: 1.5rem !important;
    }
    .dashboard-action-grid {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 1rem !important;
        margin-bottom: 1.5rem !important;
    }
    .dashboard-card {
        background: linear-gradient(180deg, rgba(255,140,0,0.06), rgba(17,24,39,0.98)) !important;
        border: 1px solid rgba(255,140,0,0.18) !important;
        border-radius: 22px !important;
        padding: 1.75rem !important;
        color: #ffffff !important;
        box-shadow: 0 18px 40px rgba(0,0,0,0.24) !important;
        transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease !important;
    }
    .dashboard-card:hover {
        transform: translateY(-4px) !important;
        border-color: #adff2f !important;
        box-shadow: 0 22px 56px rgba(173,255,47,0.14) !important;
    }
    .dashboard-card p {
        margin: 0 0 0.75rem 0 !important;
    }
    .dashboard-card .stat-label {
        color: #9ca3af !important;
        font-size: 0.95rem !important;
        text-transform: uppercase !important;
        letter-spacing: 0.06em !important;
    }
    .dashboard-card .stat-value {
        color: #ffffff !important;
        font-size: 2.35rem !important;
        font-weight: 800 !important;
        margin-bottom: 0.55rem !important;
    }
    .dashboard-card .stat-description {
        color: #94a3b8 !important;
        font-size: 0.95rem !important;
        line-height: 1.7 !important;
    }
    .recent-conversation-card {
        background: rgba(15, 23, 42, 0.95) !important;
        border: 1px solid rgba(255, 140, 0, 0.18) !important;
        border-radius: 22px !important;
        padding: 1.25rem 1.5rem !important;
        margin-bottom: 1rem !important;
        box-shadow: 0 18px 40px rgba(0,0,0,0.22) !important;
        transition: transform 0.3s ease, border-color 0.3s ease, background 0.3s ease !important;
    }
    .recent-conversation-card:hover {
        transform: translateY(-3px) !important;
        border-color: #ff8c00 !important;
        background: rgba(26, 32, 44, 1) !important;
    }
    .recent-conversation-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 1rem !important;
    }
    .recent-conversation-title {
        margin: 0 !important;
        color: #ffffff !important;
        font-size: 1rem !important;
        font-weight: 700 !important;
    }
    .recent-conversation-project {
        margin: 0 !important;
        color: #94a3b8 !important;
        font-size: 0.9rem !important;
    }
    .recent-conversation-meta {
        color: #8b949e !important;
        font-size: 0.85rem !important;
        margin-top: 0.85rem !important;
    }
    .recent-conversation-action {
        margin-top: 1rem !important;
        display: inline-block !important;
        color: #ff8c00 !important;
        font-weight: 700 !important;
    }
    .dashboard-action-card {
        background: linear-gradient(180deg, rgba(255,140,0,0.08), #111827) !important;
        border: 1px solid rgba(255,140,0,0.15) !important;
        border-radius: 22px !important;
        padding: 1.5rem !important;
        min-height: 170px !important;
    }
    .dashboard-action-card:hover {
        transform: translateY(-4px) !important;
        border-color: #ff8c00 !important;
        box-shadow: 0 24px 60px rgba(255,140,0,0.16) !important;
    }
    .dashboard-action-card p {
        color: #cbd5e1 !important;
        margin-bottom: 1rem !important;
    }
    .auth-feature-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 1rem !important;
        margin-top: 1.5rem !important;
    }
    .auth-feature {
        padding: 1.15rem !important;
        border-radius: 18px !important;
        background: rgba(255,140,0,0.08) !important;
        border: 1px solid rgba(255,140,0,0.18) !important;
    }
    .auth-feature h4 {
        margin: 0 0 0.5rem 0 !important;
        color: #ffffff !important;
    }
    .auth-feature p {
        margin: 0 !important;
        color: #c9d1d9 !important;
        font-size: 0.95rem !important;
        line-height: 1.65 !important;
    }
    .auth-form-title {
        color: #ffffff !important;
        margin-bottom: 1rem !important;
    }
    .auth-helper {
        color: #94a3b8 !important;
        margin-bottom: 1.75rem !important;
        line-height: 1.7 !important;
    }
    .chat-panel {
        padding: 1.8rem !important;
        border: 1px solid rgba(255,140,0,0.18) !important;
        border-radius: 26px !important;
        background: linear-gradient(180deg, #111827 0%, #141b24 100%) !important;
        box-shadow: 0 24px 70px rgba(0,0,0,0.32) !important;
        transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease !important;
    }
    .chat-panel:hover {
        transform: translateY(-3px) !important;
        border-color: #ff8c00 !important;
        box-shadow: 0 28px 80px rgba(255,140,0,0.16) !important;
    }
    .chat-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 1rem !important;
        margin-bottom: 1.5rem !important;
    }
    .chat-header h2 {
        margin: 0 !important;
        color: #ffffff !important;
        font-size: 1.75rem !important;
    }
    .chat-banner {
        padding: 0.75rem 1rem !important;
        border-radius: 999px !important;
        background: rgba(255,140,0,0.16) !important;
        color: #ffde7a !important;
        font-weight: 700 !important;
        font-size: 0.95rem !important;
    }
    [data-testid="stChatInput"] {
        border: 1px solid rgba(255,140,0,0.18) !important;
        border-radius: 24px !important;
        padding: 1rem !important;
        background: linear-gradient(180deg, rgba(255,140,0,0.06), #0d1117) !important;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05) !important;
    }
    [data-testid="stChatInput"] textarea {
        background: transparent !important;
        color: #e2e8f0 !important;
        min-height: 170px !important;
        font-size: 1rem !important;
    }
    [data-testid="stChatInput"]:focus-within {
        border-color: #ff8c00 !important;
        box-shadow: 0 0 0 2px rgba(255,140,0,0.2) !important;
    }
    [data-testid="stChatMessage"] {
        border-radius: 18px !important;
        margin-bottom: 1rem !important;
        background-color: #151b24 !important;
        border: 1px solid rgba(255,140,0,0.12) !important;
        color: #e5e7eb !important;
        padding: 1.2rem !important;
        transition: transform 0.25s ease, box-shadow 0.25s ease !important;
    }
    [data-testid="stChatMessage"]:nth-child(odd) { border-left: 4px solid #58a6ff !important; }
    [data-testid="stChatMessage"]:nth-child(even) { border-left: 4px solid #ff8c00 !important; }
    [data-testid="stChatMessage"]:hover {
        transform: translateX(1px) !important;
        box-shadow: 0 12px 28px rgba(255,140,0,0.16) !important;
    }

    /* Dark Outlines for Inputs */
    [data-testid="stTextInput"] input, [data-testid="stTextArea"] textarea {
        background-color: #0f1620 !important;
        color: #f8fafc !important;
        border: 1px solid #30363d !important;
        border-radius: 14px !important;
        padding: 0.95rem 1rem !important;
        box-shadow: inset 0 0 0 1px rgba(255,140,0,0.08) !important;
    }
    [data-testid="stTextInput"] input:hover, [data-testid="stTextArea"] textarea:hover,
    [data-testid="stTextInput"] input:focus, [data-testid="stTextArea"] textarea:focus {
        border-color: #ff8c00 !important;
        box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.18) !important;
    }
    [data-testid="stTextInput"] label, [data-testid="stTextArea"] label {
        color: #dbeafe !important;
        font-weight: 600 !important;
    }

    /* Fix for Selectbox Text Visibility */
    [data-baseweb="select"] div {
        color: #ffffff !important;
    }

    /* Sidebar Popover Button Styling */
    [data-testid="stSidebar"] div[data-testid="stPopover"] {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    [data-testid="stSidebar"] [data-testid="stPopover"] > button {
        background-color: transparent !important;
        border: 1px solid #30363d !important;
        padding: 0 !important;
        color: #8b949e !important;
        font-size: 16px !important;
        border-radius: 50% !important;
        width: 28px !important;
        height: 28px !important;
        transition: all 0.2s ease !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    [data-testid="stSidebar"] [data-testid="stPopover"] > button:hover {
        color: #000000 !important;
        background-color: #adff2f !important; 
        border-color: #adff2f !important;
        box-shadow: 0 0 12px rgba(173, 255, 47, 0.4) !important;
    }

    /* Sidebar Chat History Buttons */
    [data-testid="stSidebar"] .stButton > button {
        background: linear-gradient(180deg, #111827 0%, #161f2f 100%) !important;
        color: #f8fafc !important;
        border: 1px solid rgba(255, 140, 0, 0.18) !important;
        border-radius: 18px !important;
        padding: 0.95rem 1rem !important;
        text-align: left !important;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.18) !important;
    }
    [data-testid="stSidebar"] .stButton > button:hover {
        background: rgba(255, 140, 0, 0.14) !important;
        color: #ffffff !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 18px 45px rgba(255, 140, 0, 0.16) !important;
    }
    [data-testid="stSidebar"] .stButton > button:active {
        background: rgba(255, 140, 0, 0.2) !important;
    }
    [data-testid="stSidebar"] .stButton > button p {
        color: #f8fafc !important;
    }

    /* Dashboard Cards Styling */
    .dashboard-card {
        background-color: #1f2937 !important;
        padding: 1.5rem !important;
        border-radius: 12px !important;
        border: 1px solid #30363d !important;
        margin-bottom: 1rem !important;
        border-left: 5px solid #ff8c00 !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        transition: transform 0.2s ease !important;
    }
    .dashboard-card:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
    }
    .stat-label {
        color: #8b949e !important;
        font-size: 0.9rem !important;
        margin-bottom: 5px !important;
    }
    .stat-value {
        color: #adff2f !important;
        font-size: 1.8rem !important;
        font-weight: bold !important;
    }

    /* Expander Styling */
    [data-testid="stExpander"] {
        background-color: #1f2937 !important;
        border: 1px solid #30363d !important;
        border-radius: 8px !important;
    }
    [data-testid="stExpander"] summary {
        color: #ffffff !important;
        font-weight: 600 !important;
    }

    /* Metric Cards */
    [data-testid="stMetric"] {
        background-color: #1f2937 !important;
        border: 1px solid #30363d !important;
        border-radius: 8px !important;
        padding: 1rem !important;
    }
    [data-testid="stMetric"] label {
        color: #8b949e !important;
    }
    [data-testid="stMetric"] div[data-testid="stMetricValue"] {
        color: #adff2f !important;
        font-size: 2rem !important;
        font-weight: bold !important;
    }

    /* Success/Error Messages */
    [data-testid="stAlert"] {
        background-color: #1f2937 !important;
        border: 1px solid #30363d !important;
        border-radius: 8px !important;
        color: #ffffff !important;
    }
    [data-testid="stAlert"][data-baseweb="notification"] {
        background-color: rgba(255, 140, 0, 0.1) !important;
        border-color: #ff8c00 !important;
    }

    /* Columns and Layout */
    [data-testid="stHorizontalBlock"] {
        gap: 1rem !important;
    }

    /* Ensure all text is readable */
    *, *::before, *::after {
        color: inherit !important;
    }
    </style>
""", unsafe_allow_html=True)

def inject_scroll_script():
    return

settings = get_settings()
db = Database(settings.database_path)
db.initialize()

MODEL_OPTIONS = {
    "perplexity": [
        "sonar",
        "sonar-pro",
        "sonar-reasoning-pro",
        "sonar-deep-research",
    ],
    "anthropic": [
        "claude-3-5-sonnet-20240620",
        "claude-3-5-opus-20240229",
        "claude-3-5-haiku-20240307",
        "claude-3-opus-20240229",
        "claude-3-haiku-20240307",
    ]
}

MODEL_PROMPT_HINTS = {
    "sonar": (
        "Use a fast, general-purpose response style. Keep answers concise, grounded, practical, "
        "and easy to scan for outreach and messaging."
    ),
    "sonar-pro": (
        "Use a polished and persuasive style with deeper analysis and a professional tone. "
        "Emphasize strategy, impact, personalization, and clear next steps."
    ),
    "sonar-reasoning-pro": (
        "Use strong reasoning and explicit decision criteria. Compare options, explain why the "
        "recommended outreach approach works, and make the answer more analytical and evidence-driven."
    ),
    "sonar-deep-research": (
        "Act like a research-heavy strategist. Deliver a fuller answer with deeper context, richer "
        "insights, stronger synthesis, and more detailed rationale for outreach decisions."
    ),
    "claude-3-5-sonnet-20240620": (
        "Use a nuanced, business-savvy tone with high creativity and polished communication. "
        "Focus on outreach quality and thoughtful personalization."
    ),
    "claude-3-5-opus-20240229": (
        "Use a confident executive-style tone with clear structure and persuasive messaging. "
        "Keep the answer professional and focused for sales outreach."
    ),
    "claude-3-5-haiku-20240307": (
        "Use a concise, elegant, and slightly creative tone. Keep the response short, poetic, "
        "and memorable while still being actionable."
    ),
    "claude-3-opus-20240229": (
        "Use the classic Claude Opus style with reliable clarity, factual structure, and strong tone."
    ),
    "claude-3-haiku-20240307": (
        "Use a concise and poetic style with short lines, precise messaging, and memorable phrasing."
    ),
}

MODEL_TEMPERATURES = {
    "sonar": 0.35,
    "sonar-pro": 0.55,
    "sonar-reasoning-pro": 0.3,
    "sonar-deep-research": 0.4,
    "claude-3-5-sonnet-20240620": 0.4,
    "claude-3-5-opus-20240229": 0.3,
    "claude-3-5-haiku-20240307": 0.55,
    "claude-3-opus-20240229": 0.35,
    "claude-3-haiku-20240307": 0.5,
}

PROVIDERS = {"Perplexity": "perplexity", "Anthropic (Claude)": "anthropic"}

LEGACY_MODEL_ALIASES = {
    "perplexity": {
        "sonar-mini": "sonar",
        "sonar-reasoning": "sonar-reasoning-pro",
        "sonar-pro-reasoning": "sonar-reasoning-pro",
    }
}


def get_valid_model(provider: str, model: str | None) -> str:
    available_models = MODEL_OPTIONS.get(provider, [])
    resolved_model = LEGACY_MODEL_ALIASES.get(provider, {}).get(model or "", model)
    if resolved_model in available_models:
        return resolved_model
    if available_models:
        return available_models[0]
    raise ValueError(f"No models configured for provider: {provider}")


cookie_manager = stx.CookieManager()


def initialize_state() -> None:
    st.session_state.setdefault("user", None)
    st.session_state.setdefault("page", "dashboard")
    st.session_state.setdefault("messages", [])
    st.session_state.setdefault("chat_error", None)
    st.session_state.setdefault("selected_project_id", None)
    st.session_state.setdefault("selected_chat_id", None)


def sign_session_token(user: dict[str, Any]) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def sync_user_from_cookie() -> None:
    if st.session_state.get("user"):
        return

    token = cookie_manager.get("session_token")
    if not token:
        return

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user = db.get_user_by_id(payload["sub"])
        if user:
            st.session_state["user"] = user
    except jwt.PyJWTError:
        if cookie_manager.get("session_token"):
            cookie_manager.delete("session_token")


def login_user(user: dict[str, Any]) -> None:
    token = sign_session_token(user)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    cookie_manager.set("session_token", token, expires_at=expires_at)
    st.session_state["user"] = user


def logout_user() -> None:
    if cookie_manager.get("session_token"):
        cookie_manager.delete("session_token")
    st.session_state["user"] = None
    st.session_state["page"] = "chat"
    st.session_state["messages"] = []
    st.session_state["chat_error"] = None
    st.rerun()


def on_project_change():
    """Reset chat selection when project changes to prevent loading wrong history."""
    st.session_state["selected_chat_id"] = None
    # Sync the selection immediately
    if "project_selector" in st.session_state:
        st.session_state["selected_project_id"] = st.session_state.project_selector



def render_auth_screen() -> None:
    col1, col2, col3 = st.columns([1, 2.4, 1])

    with col2:
        st.markdown("""
            <div class="auth-header">
                <h1>AI Outreach</h1>
                <p>High-conversion outreach workflows with AI-powered campaign intelligence.</p>
            </div>
            <div class="ui-card" style="margin-bottom: 1.5rem;">
                <h3 style="margin-top:0; color:#ffffff;">Professional onboarding</h3>
                <p class="auth-helper">
                    Start with a premium login experience designed for modern sales and outreach teams.
                </p>
                <div class="auth-feature-grid">
                    <div class="auth-feature">
                        <h4>Premium first impression</h4>
                        <p>A bold, polished entry point that feels trustworthy and enterprise-ready.</p>
                    </div>
                    <div class="auth-feature">
                        <h4>Security first</h4>
                        <p>Encrypted API key storage and secure sessions keep your outreach data protected.</p>
                    </div>
                    <div class="auth-feature">
                        <h4>Fast workflow</h4>
                        <p>Clear form layout and concise validation help users get started without friction.</p>
                    </div>
                    <div class="auth-feature">
                        <h4>Modern design</h4>
                        <p>Sleek panels, elegant spacing, and refined hover states create a high-end feel.</p>
                    </div>
                </div>
            </div>
        """, unsafe_allow_html=True)

        login_tab, register_tab = st.tabs(["Login", "Register"])

        with login_tab:
            with st.form("login_form"):
                st.markdown("""
                    <div class="ui-card">
                        <h2 class="auth-form-title">Welcome back</h2>
                        <p class="auth-helper">Enter your email and password to open your AI outreach workspace.</p>
                    </div>
                """, unsafe_allow_html=True)
                email = st.text_input("Email Address", placeholder="name@company.com", key="login_email")
                password = st.text_input("Password", type="password", placeholder="••••••••", key="login_password")
                submitted = st.form_submit_button("Log In", use_container_width=True)

                if submitted:
                    user = db.get_user_by_email(email.strip().lower())
                    if not user or not verify_password(password, user["password_hash"]):
                        st.error("Invalid email or password.")
                    else:
                        login_user(user)
                        st.rerun()

        with register_tab:
            with st.form("register_form"):
                st.markdown("""
                    <div class="ui-card">
                        <h2 class="auth-form-title">Create your account</h2>
                        <p class="auth-helper">Securely register and start building campaigns with AI-driven outreach.</p>
                    </div>
                """, unsafe_allow_html=True)
                email = st.text_input("Business Email", placeholder="name@company.com", key="register_email")
                password = st.text_input("Choose Password", type="password", placeholder="Min. 8 characters", key="register_password")
                confirm = st.text_input("Confirm Password", type="password", placeholder="Confirm your password", key="register_confirm")
                submitted = st.form_submit_button("Create Account", use_container_width=True)

                if submitted:
                    normalized_email = email.strip().lower()
                    if not normalized_email or "@" not in normalized_email:
                        st.error("Please enter a valid email.")
                    elif len(password) < 8:
                        st.error("Password must be at least 8 characters.")
                    elif password != confirm:
                        st.error("Passwords do not match.")
                    elif db.get_user_by_email(normalized_email):
                        st.error("An account with this email already exists.")
                    else:
                        user = db.create_user(normalized_email, hash_password(password))
                        login_user(user)
                        st.rerun()


def render_sidebar(user: dict[str, Any]) -> None:
    st.sidebar.title("AI Outreach Assistant")
    st.sidebar.caption(user["email"])
    
    # Navigation
    if st.sidebar.button("🏠 Dashboard", use_container_width=True):
        st.session_state["page"] = "dashboard"
        st.rerun()
    if st.sidebar.button("💬 Chat", use_container_width=True):
        st.session_state["page"] = "chat"
        st.rerun()
    if st.sidebar.button("📁 Projects", use_container_width=True):
        st.session_state["page"] = "projects"
        st.rerun()
    if st.sidebar.button("🚀 Deploy", use_container_width=True):
        st.session_state["page"] = "deploy"
        st.rerun()
    if st.sidebar.button("⚙️ Settings", use_container_width=True):
        st.session_state["page"] = "settings"
        st.rerun()

    st.sidebar.divider()

    projects = db.list_projects(user["id"])
    
    st.sidebar.subheader("Campaign Projects")
    if projects:
        # Ensure we have a valid selection in state
        if not st.session_state["selected_project_id"] or st.session_state["selected_project_id"] not in [p["id"] for p in projects]:
            st.session_state["selected_project_id"] = projects[0]["id"]

        selected_pid = st.sidebar.selectbox(
            "Select Active Project",
            options=[project["id"] for project in projects],
            index=next((i for i, p in enumerate(projects) if p["id"] == st.session_state["selected_project_id"]), 0),
            format_func=lambda pid: next(p["name"] for p in projects if p["id"] == pid),
            key="project_selector",
            on_change=on_project_change
        )

    with st.sidebar.expander("Create new project", expanded=not projects):
        with st.form("create_project_form", clear_on_submit=True):
            name = st.text_input("Project name")
            system_prompt = st.text_area(
                "System prompt",
                height=180,
                placeholder=(
                    "Define AI behavior here...\n"
                    "Example: Write short outreach messages, use curiosity-based hooks, "
                    "avoid jargon, and include a clear CTA."
                ),
            )
            submitted = st.form_submit_button("Create project", use_container_width=True)

        if submitted:
            if not name.strip() or not system_prompt.strip():
                st.sidebar.error("Name and Prompt are required.")
            else:
                project = db.create_project(user["id"], name.strip(), system_prompt.strip())
                st.session_state["selected_project_id"] = project["id"]
                st.session_state["selected_chat_id"] = None
                st.rerun()

    # --- SIDEBAR CHAT LIST WITH EDIT/DELETE ---
    selected_project_id = st.session_state.get("selected_project_id")
    if selected_project_id and projects:
        st.sidebar.subheader("Chat History")
        if st.sidebar.button("＋ New Conversation", use_container_width=True):
            chat = db.create_chat(selected_project_id, "New Chat")
            st.session_state["selected_chat_id"] = chat["id"]
            st.session_state["page"] = "chat"
            st.rerun()

        chats = db.list_chats(selected_project_id)
        for chat in chats:
            col1, col2 = st.sidebar.columns([8.5, 1.5])
            with col1:
                if col1.button(chat["title"], key=f"chat_{chat['id']}", use_container_width=True):
                    st.session_state["selected_chat_id"] = chat["id"]
                    st.session_state["page"] = "chat"
                    st.rerun()
            with col2:
                with st.popover("⋮"):
                    new_title = st.text_input("Rename", value=chat["title"], key=f"ren_{chat['id']}")
                    if st.button("Save", key=f"save_{chat['id']}"):
                        db.update_chat_title(chat["id"], user["id"], new_title)
                        st.rerun()
                    if st.button("Delete", key=f"del_{chat['id']}", type="primary"):
                        db.delete_chat(chat["id"], user["id"])
                        if st.session_state.get("selected_chat_id") == chat["id"]:
                            st.session_state["selected_chat_id"] = None
                        st.rerun()

    st.sidebar.divider()
    if st.sidebar.button("Log out", use_container_width=True):
        logout_user()


def render_project_settings(user: dict[str, Any], project: dict[str, Any]) -> None:
    st.subheader("Project settings")
    st.caption("Every project has its own behavior, tone, structure, and writing rules.")

    with st.form("update_project_form"):
        name = st.text_input("Project name", value=project["name"])
        system_prompt = st.text_area(
            "System prompt",
            value=project["system_prompt"],
            height=260,
        )
        submitted = st.form_submit_button("Save changes")

    if submitted:
        if not name.strip() or not system_prompt.strip():
            st.error("Project name and system prompt are required.")
        else:
            db.update_project(project["id"], user["id"], name.strip(), system_prompt.strip())
            st.success("Project updated.")
            st.rerun()

    st.divider()
    if st.button("Delete project", type="primary"):
        db.delete_project(project["id"], user["id"])
        st.session_state["selected_project_id"] = None
        st.session_state["selected_chat_id"] = None
        st.rerun()


def render_dashboard_page(user: dict[str, Any]) -> None:
    projects = db.list_projects(user["id"])
    total_projects = len(projects)
    total_chats = 0
    total_messages = 0
    recent_chats: list[dict[str, Any]] = []

    for project in projects:
        chats = db.list_chats(project["id"])
        total_chats += len(chats)
        for chat in chats:
            total_messages += len(db.list_messages(chat["id"]))
            recent_chats.append({
                "project_name": project["name"],
                "title": chat["title"],
                "updated_at": chat["updated_at"],
                "id": chat["id"],
                "project_id": project["id"],
            })

    recent_chats.sort(key=lambda item: item["updated_at"], reverse=True)
    recent_chats = recent_chats[:6]

    provider_name = "Anthropic (Claude)" if user.get("api_provider") == "anthropic" else "Perplexity"

    st.header("Dashboard")
    st.write("Welcome back to the AI Outreach workspace. Manage projects, chat history, deployment, and provider settings from one place.")

    st.markdown(f"""
        <div class="dashboard-summary-grid">
            <div class="dashboard-card">
                <p class="stat-label">Projects</p>
                <p class="stat-value">{total_projects}</p>
                <p class="stat-description">Campaign workspaces organized for every outreach stream.</p>
            </div>
            <div class="dashboard-card">
                <p class="stat-label">Conversations</p>
                <p class="stat-value">{total_chats}</p>
                <p class="stat-description">AI-ready dialogues across all projects.</p>
            </div>
            <div class="dashboard-card">
                <p class="stat-label">Messages</p>
                <p class="stat-value">{total_messages}</p>
                <p class="stat-description">Total copy and responses created so far.</p>
            </div>
            <div class="dashboard-card">
                <p class="stat-label">Provider</p>
                <p class="stat-value">{provider_name}</p>
                <p class="stat-description">Selected model: {user.get('preferred_model') or 'Configured model'}</p>
            </div>
        </div>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("Quick actions")
    action_cols = st.columns([1, 1, 1, 1])
    with action_cols[0]:
        st.markdown('<div class="dashboard-card"><p class="stat-label">Create a project</p><p class="stat-description">Build a new campaign workspace with custom AI instructions.</p></div>', unsafe_allow_html=True)
        if st.button("📂 New Project", use_container_width=True):
            st.session_state["page"] = "projects"
            st.rerun()
    with action_cols[1]:
        st.markdown('<div class="dashboard-card"><p class="stat-label">Open chat</p><p class="stat-description">Start a new outreach conversation with your selected AI provider.</p></div>', unsafe_allow_html=True)
        if st.button("💬 Open Chat", use_container_width=True):
            st.session_state["page"] = "chat"
            st.rerun()
    with action_cols[2]:
        st.markdown('<div class="dashboard-card"><p class="stat-label">Provider settings</p><p class="stat-description">Update your model and API configuration anytime easily and seamlessly.</p></div>', unsafe_allow_html=True)
        if st.button("⚙️ Settings", use_container_width=True):
            st.session_state["page"] = "settings"
            st.rerun()
    with action_cols[3]:
        st.markdown('<div class="dashboard-card"><p class="stat-label">Launch deploy</p><p class="stat-description">Publish the app with official deployment guidance and documentation support.</p></div>', unsafe_allow_html=True)
        if st.button("🚀 Deploy", use_container_width=True):
            st.session_state["page"] = "deploy"
            st.rerun()

    st.markdown("---")
    st.subheader("Recent conversations")
    if recent_chats:
        for entry in recent_chats:
            with st.container():
                st.markdown(f"""
                    <div class="recent-conversation-card">
                        <div class="recent-conversation-header">
                            <div>
                                <p class="recent-conversation-title">{entry['title']}</p>
                                <p class="recent-conversation-project">{entry['project_name']}</p>
                            </div>
                            <span class="recent-conversation-action"></span>
                        </div>
                        <p class="recent-conversation-meta">Last updated: {entry['updated_at']}</p>
                    </div>
                """, unsafe_allow_html=True)
                if st.button("Open chat", key=f"open_chat_{entry['id']}", use_container_width=True):
                    st.session_state["page"] = "chat"
                    st.session_state["selected_project_id"] = entry["project_id"]
                    st.session_state["selected_chat_id"] = entry["id"]
                    st.rerun()
    else:
        st.info("No conversations yet. Start a new project and send your first message.")

    st.markdown("---")
    st.subheader("Deployment & Setup")
    st.write("Use the built-in deploy links in Settings to publish the app, or run locally using Streamlit.")


def render_projects_page(user: dict[str, Any]) -> None:
    st.header("Projects")
    st.write("Manage campaign workspaces, system prompts, and project-based chat context.")

    projects = db.list_projects(user["id"])
    if projects:
        for project in projects:
            with st.container():
                cols = st.columns([2, 2, 1, 1])
                cols[0].markdown(f"#### {project['name']}")
                cols[0].write(project["system_prompt"][:120] + ("..." if len(project["system_prompt"]) > 120 else ""))
                if cols[1].button("Edit", key=f"edit_project_{project['id']}", use_container_width=True):
                    st.session_state["page"] = "project_settings"
                    st.session_state["selected_project_id"] = project["id"]
                    st.rerun()
                if cols[2].button("Chat", key=f"chat_project_{project['id']}", use_container_width=True):
                    st.session_state["page"] = "chat"
                    st.session_state["selected_project_id"] = project["id"]
                    st.session_state["selected_chat_id"] = None
                    st.rerun()
                if cols[3].button("Delete", key=f"delete_project_{project['id']}", use_container_width=True):
                    db.delete_project(project["id"], user["id"])
                    st.success("Project deleted.")
                    st.rerun()
                st.markdown("---")
    else:
        st.info("No projects found. Create one to get started.")

    with st.form("create_project_form_page", clear_on_submit=True):
        st.subheader("Create a new project")
        name = st.text_input("Project name")
        system_prompt = st.text_area(
            "System prompt",
            height=180,
            placeholder=(
                "Define AI behavior here...\n"
                "Example: Write short outreach messages, use curiosity-based hooks, "
                "avoid jargon, and include a clear CTA."
            ),
        )
        submitted = st.form_submit_button("Create project")

    if submitted:
        if not name.strip() or not system_prompt.strip():
            st.error("Project name and system prompt are required.")
        else:
            project = db.create_project(user["id"], name.strip(), system_prompt.strip())
            st.success("Project created.")
            st.session_state["selected_project_id"] = project["id"]
            st.session_state["selected_chat_id"] = None
            st.rerun()


def render_deploy_page(user: dict[str, Any]) -> None:
    st.header(" Deploy Your AI Outreach Assistant")
    st.write("Get your app live on the web with one-click deployment options. Choose from Streamlit Cloud, Vercel, or other platforms.")

    st.markdown("---")
    st.subheader("Streamlit Community Cloud (Recommended)")
    st.write("Free hosting for Streamlit apps with automatic scaling.")
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("📋 Copy Deploy Instructions", use_container_width=True):
            st.code("""
1. Push this repo to GitHub
2. Go to share.streamlit.io
3. Connect your GitHub repo
4. Set main file to app.py
5. Add secrets: JWT_SECRET, ENCRYPTION_MASTER_KEY, PERPLEXITY_MODEL, ANTHROPIC_MODEL
6. Deploy!
            """, language="text")
    with col2:
        st.markdown("[🚀 Open Streamlit Cloud](https://share.streamlit.io)", unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("Alternative Deployment Options")
    
    deploy_options = [
        {
            "name": "Vercel",
            "icon": "▲",
            "description": "Fast deployment with global CDN",
            "link": "https://vercel.com/new"
        },
        {
            "name": "Railway",
            "icon": "🚂",
            "description": "Easy Python app deployment",
            "link": "https://railway.app/new"
        },
        {
            "name": "Heroku",
            "icon": "🟣",
            "description": "Classic cloud platform",
            "link": "https://heroku.com/deploy"
        }
    ]
    
    cols = st.columns(len(deploy_options))
    for i, option in enumerate(deploy_options):
        with cols[i]:
            st.markdown(f"""
            <div style="background-color: #1f2937; padding: 1.5rem; border-radius: 12px; border: 1px solid #30363d; text-align: center; margin-bottom: 1rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">{option['icon']}</div>
                <h4 style="color: #ffffff; margin: 0.5rem 0;">{option['name']}</h4>
                <p style="color: #8b949e; font-size: 0.9rem; margin: 0.5rem 0;">{option['description']}</p>
                <a href="{option['link']}" target="_blank" style="color: #ff8c00; text-decoration: none; font-weight: 600;">Deploy →</a>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("---")
    st.subheader("Local Development")
    st.write("For local testing and development:")
    st.code("streamlit run app.py", language="bash")
    st.write("Make sure to set up your `.env` file with API keys and secrets.")


def render_settings(user: dict[str, Any]) -> None:
    st.title("AI Outreach Assistant")
    st.caption("Select your AI provider, save your API key, and start chatting.")

    current_provider = user.get("api_provider") or "perplexity"
    current_model = get_valid_model(current_provider, user.get("preferred_model"))
    
    # Find the display name for the current provider
    provider_index = 0
    provider_list = list(PROVIDERS.values())
    if current_provider in provider_list:
        provider_index = provider_list.index(current_provider)

    placeholder = (
        "A key is already saved. Paste a new one to replace it."
        if user.get("encrypted_api_key")
        else "Paste your key here..."
    )

    with st.form("api_key_form"):
        selected_provider_name = st.selectbox(
            "Select API Provider", 
            options=list(PROVIDERS.keys()),
            index=provider_index
        )
        
        provider_key = PROVIDERS[selected_provider_name]
        available_models = MODEL_OPTIONS.get(provider_key, [])
        
        model_index = 0
        if current_model in available_models:
            model_index = available_models.index(current_model)
            
        selected_model = st.selectbox(
            "Preferred AI Model",
            options=available_models,
            index=model_index,
            help="Choose a model. Pro/Opus models are smarter but slower."
        )

        api_key = st.text_input("API key", type="password", placeholder=placeholder)
        submitted = st.form_submit_button("Save API key and Start Chatting", use_container_width=True)

    if submitted:
        provider_val = PROVIDERS[selected_provider_name]
        if not api_key.strip():
            st.error("Please enter a valid API key.")
        else:
            try:
                clean_api_key = sanitize_api_key(api_key)
                encrypted = encrypt_api_key(clean_api_key, settings.encryption_master_key)
                db.update_user_api_key(user["id"], encrypted, provider_val, selected_model)
                st.session_state["user"] = db.get_user_by_id(user["id"])
                st.success("API key saved securely. You can now start chatting!")
                st.rerun()
            except ValueError as error:
                st.error(str(error))

    if user.get("encrypted_api_key"):
        st.divider()
        if st.button("Delete saved API key"):
            db.update_user_api_key(user["id"], None, None, None)
            st.session_state["user"] = db.get_user_by_id(user["id"])
            st.success("API key deleted.")
            st.rerun()

    # Deploy and GitHub buttons
    st.divider()
    st.markdown(
        """
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1rem;">
            <a href="https://github.com/waqi786/ai-outreach-assistant-streamlit" target="_blank"
                style="padding:0.9rem 1.2rem; background:#FF8C00; color:#000; border-radius:14px; font-weight:700; text-decoration:none; display:inline-block;">
                📂 View GitHub repo
            </a>
            <a href="https://share.streamlit.io" target="_blank"
                style="padding:0.9rem 1.2rem; background:#FF8C00; color:#000; border-radius:14px; font-weight:700; text-decoration:none; display:inline-block;">
                🚀 Deploy on Streamlit Cloud
            </a>
        </div>
        <p style="margin-top:0; color:#c9d1d9; max-width:720px; line-height:1.6;">
            Push this repository to GitHub, then connect it in Streamlit Community Cloud for one-click deployment. Use the same secrets from your local `.env` file.
        </p>
        """,
        unsafe_allow_html=True,
    )


def render_chat(user: dict[str, Any]) -> None:
    st.title("AI Outreach Assistant")
    st.caption("Create polished outreach messages with your provider and model settings.")

    st.markdown("""
        <div class="chat-panel">
            <div class="chat-header">
                <div>
                    <h2>Live campaign chat</h2>
                    <p style="margin:0; color:#94a3b8;">A refined chat workspace for high-quality AI outreach and messaging.</p>
                </div>
                <div class="chat-banner">Secure provider connection</div>
            </div>
        </div>
    """, unsafe_allow_html=True)

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    user_input = st.chat_input("Describe the outreach scenario you want the AI to handle...")
    if not user_input:
        return

    if not user.get("encrypted_api_key"):
        st.error("Please save an API key in settings before sending messages.")
        return

    try:
        encrypted_key = user["encrypted_api_key"]
        api_key = sanitize_api_key(decrypt_api_key(encrypted_key, settings.encryption_master_key))
    except ValueError:
        st.error(
            "Your saved API key appears to be invalid. Please go to settings and save it again."
        )
        return

    # Add user message
    st.session_state.messages.append({"role": "user", "content": user_input.strip()})
    
    try:
        provider = user.get("api_provider") or "perplexity"
        chosen_model = user.get("preferred_model")
        
        if provider == "anthropic":
            try:
                from streamlit_src.claude import ClaudeService
                model_to_use = get_valid_model("anthropic", chosen_model or settings.anthropic_model)
                service = ClaudeService(model=model_to_use)
            except ImportError:
                st.error("The `anthropic` library is not installed. Please run `pip install anthropic` to use Claude.")
                return
        else:
            try:
                from streamlit_src.perplexity import PerplexityService
                model_to_use = get_valid_model("perplexity", chosen_model or settings.perplexity_model)
                service = PerplexityService(model=model_to_use)
            except ImportError:
                st.error("The `openai` library is not installed. Please run `pip install openai` to use Perplexity.")
                return

        with st.spinner("AI is writing your outreach message..."):
            # Use a default system prompt since no projects
            base_prompt = (
                "You are a Strategic Outreach Expert with deep research capabilities.\n"
                "Your goal is to:\n"
                "1. Analyze the user's request and conduct deep research into the target.\n"
                "2. Find unique angles or recent company developments.\n"
                "3. Draft highly personalized outreach messages based on findings.\n"
                "4. Keep the tone professional yet human (no corporate jargon).\n"
                "5. Ensure a clear, low-friction Call to Action (CTA)."
            )
            model_hint = MODEL_PROMPT_HINTS.get(model_to_use, "")
            temperature = MODEL_TEMPERATURES.get(model_to_use, 0.45)
            system_prompt = (
                f"You are using {model_to_use}. Respond in a distinct style for this model.\n\n{base_prompt}\n\n{model_hint}"
                if model_hint else f"You are using {model_to_use}. Respond in a distinct style for this model.\n\n{base_prompt}"
            )
            assistant_reply = service.generate_response(
                api_key=api_key,
                system_prompt=system_prompt,
                history=st.session_state.messages[:-1],  # Exclude the current user message
                user_input=user_input.strip(),
                temperature=temperature,
            )
        st.session_state.messages.append({"role": "assistant", "content": assistant_reply})
        st.rerun()
    except Exception as error:
        st.session_state.messages.append({
            "role": "assistant",
            "content": (
                "I could not generate a response right now. "
                "Please check your API key, provider selection, and model access."
            ),
        })
        st.error(f"Request failed: {error}")
        st.rerun()


def render_old_sidebar(user: dict[str, Any]) -> None: # Renamed to avoid conflict
    st.sidebar.title("Menu")
    st.sidebar.write(user["email"])

    if st.sidebar.button("Settings", use_container_width=True):
        st.session_state["page"] = "settings"
        st.rerun()
    
    if st.sidebar.button("Chat", use_container_width=True):
        st.session_state["page"] = "chat"
        st.rerun()

    st.sidebar.divider()
    if st.sidebar.button("Log out", use_container_width=True):
        logout_user()


def render_chat_workspace(user: dict[str, Any], project: dict[str, Any] | None) -> None:
    if not project:
        st.info("Select or create a project to start chatting.")
        return

    inject_scroll_script()
    
    st.title(f" {project['name']}")

    selected_chat_id = st.session_state.get("selected_chat_id")
    if not selected_chat_id:
        if st.button("Create first chat"):
            chat = db.create_chat(project["id"], "New Chat")
            st.session_state["selected_chat_id"] = chat["id"]
            st.rerun()
        return

    chat = db.get_chat(selected_chat_id, user["id"])
    if not chat:
        st.warning("Selected chat was not found. Creating a new one may help.")
        return

    st.info(f"Currently viewing: **{chat['title']}**")

    messages = db.list_messages(chat["id"])
    if not messages:
        st.info("The workspace is ready. Provide details about your target audience or prospect to begin.")

    if st.session_state.get("chat_error"):
        st.error(st.session_state["chat_error"])
        st.session_state["chat_error"] = None

    for message in messages:
        role = "assistant" if message["role"] == "assistant" else "user"
        with st.chat_message(role):
            st.markdown(message["content"])

    user_input = st.chat_input("Describe the outreach scenario you want the AI to handle...")
    if not user_input:
        return

    if not user.get("encrypted_api_key"):
        st.error("Please save an API key in User Settings before sending messages.")
        return

    try:
        encrypted_key = user["encrypted_api_key"]
        api_key = sanitize_api_key(decrypt_api_key(encrypted_key, settings.encryption_master_key))
    except ValueError:
        st.error(
            "Your saved API key appears to be invalid or was pasted with unsupported characters. "
            "Please go to User Settings, delete it, and save the exact key again."
        )
        return

    db.create_message(chat["id"], "user", user_input.strip())
    if not messages:
        db.update_chat_title(chat["id"], user["id"], user_input[:50].strip() or "New Chat")
    history = db.list_recent_messages(chat["id"], limit=10)

    try:
        provider = user.get("api_provider") or "perplexity"
        chosen_model = user.get("preferred_model")
        
        if provider == "anthropic":
            try:
                from streamlit_src.claude import ClaudeService
                model_to_use = get_valid_model("anthropic", chosen_model or settings.anthropic_model)
                service = ClaudeService(model=model_to_use)
            except ImportError:
                st.error("The `anthropic` library is not installed. Please run `pip install anthropic` to use Claude.")
                return
        else:
            try:
                from streamlit_src.perplexity import PerplexityService
                model_to_use = get_valid_model("perplexity", chosen_model or settings.perplexity_model)
                service = PerplexityService(model=model_to_use)
            except ImportError:
                st.error("The `openai` library is not installed. Please run `pip install openai` to use Perplexity.")
                return

        with st.spinner("AI is writing your outreach message..."):
            model_hint = MODEL_PROMPT_HINTS.get(model_to_use, "")
            temperature = MODEL_TEMPERATURES.get(model_to_use, 0.45)
            system_prompt = (
                f"You are using {model_to_use}. Respond in a distinct style for this model.\n\n{project['system_prompt']}\n\n{model_hint}"
                if model_hint else f"You are using {model_to_use}. Respond in a distinct style for this model.\n\n{project['system_prompt']}"
            )
            assistant_reply = service.generate_response(
                api_key=api_key,
                system_prompt=system_prompt,
                history=history[:-1],
                user_input=user_input.strip(),
                temperature=temperature,
            )
        db.create_message(chat["id"], "assistant", assistant_reply)
        db.touch_chat(chat["id"])
        st.rerun()
    except Exception as error:
        db.create_message(
            chat["id"],
            "assistant",
            (
                "I could not generate a response right now. "
                "Please check your API key, provider selection, and model access."
            ),
        )
        db.touch_chat(chat["id"])
        st.session_state["chat_error"] = f"Request failed: {error}"
        st.rerun()


def render_dashboard(user: dict[str, Any]) -> None:
    """Main router to decide which page content to show."""
    page = st.session_state.get("page", "dashboard")

    if page == "settings":
        render_settings(user)
    elif page == "deploy":
        render_deploy_page(user)
    elif page == "projects":
        render_projects_page(user)
    elif page == "project_settings":
        selected_project_id = st.session_state.get("selected_project_id")
        project = db.get_project(selected_project_id, user["id"])
        if project:
            render_project_settings(user, project)
        else:
            st.session_state["page"] = "projects"
            st.rerun()
    elif page == "dashboard":
        render_dashboard_page(user)
    else:
        # Handle project-based chat workspace
        projects = db.list_projects(user["id"])
        if not projects:
            st.info("Please create your first project in the sidebar to start chatting.")
            # Display project creation form in main area if no projects exist
            with st.expander("➕ Create New Project", expanded=True):
                with st.form("create_project_form_main", clear_on_submit=True):
                    name = st.text_input("Project name")
                    system_prompt = st.text_area("System prompt", height=180, placeholder="Define AI behavior here...")
                    submitted = st.form_submit_button("Create project", use_container_width=True)
                    if submitted and name.strip() and system_prompt.strip():
                        project = db.create_project(user["id"], name.strip(), system_prompt.strip())
                        st.session_state["selected_project_id"] = project["id"]
                        st.session_state["selected_chat_id"] = None
                        st.rerun()
            return

        # Ensure a project is selected if projects exist
        if not st.session_state["selected_project_id"] or st.session_state["selected_project_id"] not in [p["id"] for p in projects]:
            st.session_state["selected_project_id"] = projects[0]["id"]

        selected_project_id = st.session_state.get("selected_project_id")
        project = db.get_project(selected_project_id, user["id"]) if selected_project_id else None
        render_chat_workspace(user, project)


initialize_state()
sync_user_from_cookie()

current_user = st.session_state.get("user")
if not current_user:
    render_auth_screen()
else:
    render_sidebar(current_user)
    st.session_state["user"] = db.get_user_by_id(current_user["id"])
    render_dashboard(st.session_state["user"])
