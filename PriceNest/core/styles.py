import streamlit as st
import pandas as pd
import numpy as np

def apply_custom_styles():
    # Initialize theme state if not exists
    if "theme" not in st.session_state:
        st.session_state.theme = "dark"

    # Define common variables and animations
    base_css = """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');

    html, body, [class*="css"]  {
        font-family: 'Outfit', sans-serif;
    }

    button {
        transition: all 0.3s ease;
    }

    .stButton>button {
        border-radius: 8px !important;
        font-weight: 600 !important;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        width: 100%;
        border: none;
    }

    .metric-card {
        padding: 20px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        margin-bottom: 15px;
        transition: transform 0.2s;
    }

    .metric-card:hover {
        transform: translateY(-5px);
    }
    
    .metric-title {
        font-size: 1.1rem;
        margin-bottom: 5px;
        font-weight: 600;
    }
    
    .metric-val {
        font-size: 2rem;
        font-weight: 700;
    }

    .gradient-text {
        background: linear-gradient(135deg, #38bdf8, #818cf8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 2.5em;
        font-weight: bold;
    }
    </style>
    """

    dark_mode = """
    <style>
    .stApp {
        background-color: #0b0f19;
        color: #f8fafc;
    }
    /* Sidebar */
    [data-testid="stSidebar"] {
        background-color: #111827;
        border-right: 1px solid rgba(255, 255, 255, 0.05);
    }
    /* Buttons */
    .stButton>button {
        background: linear-gradient(135deg, #38bdf8, #818cf8) !important;
        color: white !important;
    }
    .stButton>button:hover {
        background: linear-gradient(135deg, #0ea5e9, #6366f1) !important;
        box-shadow: 0 4px 15px rgba(56, 189, 248, 0.4);
    }
    /* Metrics */
    .metric-card {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .metric-title { color: #94a3b8; }
    .metric-val { color: #38bdf8; }
    </style>
    """

    light_mode = """
    <style>
    .stApp {
        background-color: #f8fafc;
        color: #1e293b;
    }
    [data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid rgba(0, 0, 0, 0.05);
    }
    .stButton>button {
        background: linear-gradient(135deg, #38bdf8, #818cf8) !important;
        color: white !important;
    }
    .stButton>button:hover {
        background: linear-gradient(135deg, #0ea5e9, #6366f1) !important;
        box-shadow: 0 4px 15px rgba(56, 189, 248, 0.4);
    }
    .metric-card {
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(0, 0, 0, 0.05);
    }
    .metric-title { color: #64748b; }
    .metric-val { color: #0284c7; }
    </style>
    """

    st.markdown(base_css, unsafe_allow_html=True)
    if st.session_state.theme == "dark":
        st.markdown(dark_mode, unsafe_allow_html=True)
    else:
        st.markdown(light_mode, unsafe_allow_html=True)

def render_metric_card(title, value):
    return f"""
    <div class="metric-card">
        <div class="metric-title">{title}</div>
        <div class="metric-val">{value}</div>
    </div>
    """
