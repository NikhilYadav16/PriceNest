import streamlit as st
import pandas as pd

def run():
    st.markdown('<h2 class="gradient-text">Statistical Insights</h2>', unsafe_allow_html=True)
    if 'clean_df' not in st.session_state:
        st.warning("Insights offline. Please upload a dataset first.", icon="⚠️")
        return
        
    df = st.session_state.clean_df
    target = st.session_state.target_col
    mapping = st.session_state.col_mapping
    
    # Key Trends
    st.subheader("Market Summary Overview")
    i1, i2, i3 = st.columns(3)
    
    with i1:
        val = f"{df[target].mean():,.2f}" if pd.api.types.is_numeric_dtype(df[target]) else "N/A"
        st.markdown(f'<div class="metric-card"><div class="metric-title">Average {target}</div><div class="metric-val">{val}</div></div>', unsafe_allow_html=True)
    with i2:
        val = f"{df[target].median():,.2f}" if pd.api.types.is_numeric_dtype(df[target]) else "N/A"
        st.markdown(f'<div class="metric-card"><div class="metric-title">Median {target}</div><div class="metric-val">{val}</div></div>', unsafe_allow_html=True)
    with i3:
        val = f"{df.shape[0]:,}"
        st.markdown(f'<div class="metric-card"><div class="metric-title">Total Records</div><div class="metric-val">{val}</div></div>', unsafe_allow_html=True)
        
    if mapping.get('location') and mapping['location'] in df.columns:
        st.divider()
        st.subheader("Geographical Distribution Insights")
        loc_col = mapping['location']
        
        cmax, cmin = st.columns(2)
        
        if pd.api.types.is_numeric_dtype(df[target]):
            loc_agg = df.groupby(loc_col)[target].mean().reset_index()
            loc_agg = loc_agg.sort_values(by=target, ascending=False)
            
            with cmax:
                st.write(f"**Top 10 Most Expensive Areas (by {target})**")
                st.dataframe(loc_agg.head(10), use_container_width=True)
            with cmin:
                st.write(f"**Top 10 Most Affordable Areas (by {target})**")
                st.dataframe(loc_agg.tail(10)[::-1], use_container_width=True)

    st.divider()
    st.markdown("### Export Tools")
    st.download_button(
        label="Download Cleaned Pipeline Master Dataset (CSV)",
        data=df.to_csv(index=False).encode('utf-8'),
        file_name="pricenest_cleaned_data.csv",
        mime="text/csv",
        use_container_width=True
    )
