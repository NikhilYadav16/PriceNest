import streamlit as st
import plotly.express as px

def run():
    st.markdown('<h2 class="gradient-text">Exploratory Analytics</h2>', unsafe_allow_html=True)
    if 'clean_df' not in st.session_state:
        st.warning("Analytics module offline. Please upload a dataset first.", icon="⚠️")
        return
        
    df = st.session_state.clean_df
    target = st.session_state.target_col
    
    st.subheader(f"Price/Target Distribution (`{target}`)")
    st.caption("A dense statistical breakdown of output distribution utilizing histograms and underlying box-plots.")
    fig_hist = px.histogram(df, x=target, nbins=50, marginal="box", color_discrete_sequence=['#38bdf8'])
    fig_hist.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', font=dict(color='#94a3b8'))
    st.plotly_chart(fig_hist, use_container_width=True)
    
    st.divider()
    
    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Correlation Heatmap")
        num_df = df.select_dtypes(include=['int64', 'float64'])
        if not num_df.empty and len(num_df.columns) > 1:
            corr = num_df.corr()
            fig_corr = px.imshow(corr, text_auto=True, color_continuous_scale='Blues')
            fig_corr.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', font=dict(color='#94a3b8'))
            st.plotly_chart(fig_corr, use_container_width=True)
        else:
            st.info("Insufficient multidimensional numeric features to bind a spatial correlation.")
            
    with c2:
        st.subheader("Random-Forest Impurity Reductions")
        if 'model_metrics' in st.session_state:
            fi = st.session_state.model_metrics['feat_imp'].head(10)
            fig_bar = px.bar(fi, x='Importance', y='Feature', orientation='h', color='Importance', color_continuous_scale='PubuGn')
            fig_bar.update_layout(yaxis={'categoryorder':'total ascending'}, paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)', font=dict(color='#94a3b8'))
            st.plotly_chart(fig_bar, use_container_width=True)
