import streamlit as st

def run():
    st.markdown('<div class="gradient-text" style="font-size: 3.5rem; text-align: center; margin-bottom: 0;">Welcome to PriceNest</div>', unsafe_allow_html=True)
    st.markdown('<p style="text-align: center; font-size: 1.2rem; color: #94a3b8; max-width: 700px; margin: 0 auto 40px auto;">Your intelligent, generalized Real Estate valuation engine capable of learning dynamic geographical price patterns from raw datasets.</p>', unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown('<div class="metric-card"><h3>🚀 Dynamic ML Architecture</h3><p>Upload a custom dataset from any city, and PriceNest instantly auto-detects structural parameters and fits a complex Random Forest Ensembled Machine Learning pipeline perfectly to your data.</p></div>', unsafe_allow_html=True)
        st.markdown('<div class="metric-card"><h3>📊 Visual Analytics</h3><p>Explore deep-statistical insights ranging from automated correlation heatmaps to variable impurity feature importance calculations, right entirely inside the application.</p></div>', unsafe_allow_html=True)
    with col2:
        st.markdown('<div class="metric-card"><h3>🏡 Predict Prices</h3><p>Configure property dimensions dynamically based on your loaded datasets ranges to run exact and fast price estimations, completely replacing guesswork.</p></div>', unsafe_allow_html=True)
        st.markdown('<div class="metric-card"><h3>🎨 Next-Gen Design</h3><p>A sophisticated custom-styled Glassmorphism UX built purely through Streamlit native Markdown and CSS overrides, featuring both Light & Dark modes.</p></div>', unsafe_allow_html=True)
        
    st.divider()
    st.info("👈 Please navigate using the sidebar to begin. The first step is **Upload Dataset**.")
