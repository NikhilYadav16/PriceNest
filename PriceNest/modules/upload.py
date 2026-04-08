import streamlit as st
import pandas as pd
from core.ml_pipeline import auto_detect_columns, train_dynamic_model

@st.cache_data
def get_example_data_template():
    return pd.DataFrame({
        "City": ["Example City"], 
        "Location": ["Downtown"], 
        "Bedrooms": [3], 
        "SqFt": [1500], 
        "Price": [500000]
    })

def render_metric_card(title, value):
    return f"""
    <div class="metric-card">
        <div class="metric-title">{title}</div>
        <div class="metric-val">{value}</div>
    </div>
    """

def run():
    st.markdown('<h2 class="gradient-text">Upload & Train Model</h2>', unsafe_allow_html=True)
    st.write("Upload a CSV file containing property data to dynamically train the **PriceNest** real estate valuation model. It generalizes for any locale automatically!")
    
    # Provide highly visible dataset structure hints
    st.info("The CSV should ideally contain a target value (Price) and predicting dimensions (E.g. Area sqft, Bedrooms, Neighborhood). Our engine will auto-detect matching attributes!")
    
    uploaded_file = st.file_uploader("", type=["csv"], help="Attach your generic city real-estate CSV payload here")
    
    # Render interactive functionality once uploaded
    if uploaded_file is not None:
        if 'df' not in st.session_state or st.session_state.get('curr_file') != uploaded_file.name:
            df = pd.read_csv(uploaded_file)
            st.session_state.df = df
            st.session_state.curr_file = uploaded_file.name
            st.session_state.col_mapping = auto_detect_columns(df)
            
            # Clear previous model runs if replacing dataset
            if 'model' in st.session_state:
                del st.session_state['model']
        
        df = st.session_state.df
        mapping = st.session_state.col_mapping
        
        st.success(f"✓ Dataset loaded! Interpreted {df.shape[0]:,} rows mapping {df.shape[1]} dimensional attributes.")
        
        with st.expander("Data Preview", expanded=False):
            st.dataframe(df.head())
            
        st.divider()
        st.subheader("Model Pipeline Configuration")
        
        c1, c2 = st.columns(2)
        with c1:
            default_targ_idx = df.columns.tolist().index(mapping['target']) if mapping['target'] in df.columns else 0
            target_col = st.selectbox("Target Variable (The label you want to predict)", df.columns, index=default_targ_idx)
            
        with c2:
            avail_features = df.columns.tolist()
            if target_col in avail_features:
                avail_features.remove(target_col)
                
            # Grab intelligent defaults
            detected_defaults = [mapping[k] for k in ['location', 'area', 'bedrooms', 'bathrooms'] if mapping[k] in avail_features]
            selected_features = st.multiselect("Predictive Input Features (Dimensions)", avail_features, default=detected_defaults)
            
        if st.button("🚀 Train Machine Learning Pipeline", use_container_width=True):
            if not selected_features:
                st.error("Select at least one feature parameter before continuing.")
            else:
                with st.spinner(f"Encoding properties & Training global Random Forest engine on {len(df):,} dimensions..."):
                    model, r2, mae, feat_imp, cln_df = train_dynamic_model(df, target_col, selected_features)
                    
                    st.session_state.model = model
                    st.session_state.target_col = target_col
                    st.session_state.selected_features = selected_features
                    st.session_state.clean_df = cln_df
                    st.session_state.model_metrics = {"r2": r2, "mae": mae, "feat_imp": feat_imp}
                    
                    # Compute average price formatting if numeric
                    if pd.api.types.is_numeric_dtype(y := cln_df[target_col]):
                        fmt_val = f"{y.mean():.2f}"
                    else:
                        fmt_val = "N/A"
                    
                st.toast("Model Execution Complete! ✅")
                
                # Render beautifully designed analytical responses
                m1, m2, m3 = st.columns(3)
                with m1:
                    st.markdown(render_metric_card("Accuracy (R² Score)", f"{r2*100:.1f}%"), unsafe_allow_html=True)
                with m2:
                    st.markdown(render_metric_card("Error Variance (MAE)", f"{mae:,.0f}"), unsafe_allow_html=True)
                with m3:
                    st.markdown(render_metric_card("Average Target Val", f"{fmt_val}"), unsafe_allow_html=True)
                    
                st.markdown("---")
                st.markdown("### Next Steps")
                st.write("Your model is successfully preserved in session memory. Navigate to the **Predict Price** or **Analytics** modules to explore your valuation engine!")
