import streamlit as st
import pandas as pd

def run():
    st.markdown('<h2 class="gradient-text">Predict Property Valuation</h2>', unsafe_allow_html=True)
    if 'model' not in st.session_state:
        st.warning("Prediction engine offline. Please upload a dataset to train the model.", icon="⚠️")
        return
        
    model = st.session_state.model
    features = st.session_state.selected_features
    df = st.session_state.clean_df
    target = st.session_state.target_col
    
    st.write("Configure the attributes for a dummy property dynamically modeled from your uploaded dataset context.")
    
    inputs = {}
    cols = st.columns(3)
    
    with st.form("predict_form"):
        for i, feat in enumerate(features):
            col = cols[i % 3]
            dtype = df[feat].dtype
            with col:
                if pd.api.types.is_numeric_dtype(dtype):
                    # Numeric input
                    min_v = float(df[feat].min())
                    max_v = float(df[feat].max())
                    mean_v = float(df[feat].median())
                    step_val = float((max_v - min_v) / 100) if max_v != min_v else 1.0
                    inputs[feat] = st.number_input(feat, value=mean_v, step=step_val)
                else:
                    # Categorical input dropdown
                    unique_vals = list(df[feat].dropna().unique())
                    inputs[feat] = st.selectbox(feat, unique_vals)
                    
        submit = st.form_submit_button("Generate Prediction", use_container_width=True)
        
    if submit:
        # Construct dataframe
        input_df = pd.DataFrame([inputs])
        with st.spinner("Executing valuation tree ensembles..."):
            pred = model.predict(input_df)[0]
            
        st.markdown(f"""
        <div class="metric-card" style="margin-top: 20px; text-align:center;">
            <div class="metric-title" style="font-size: 1.3rem;">Market Assessment for {target.capitalize()}</div>
            <div class="metric-val" style="font-size: 3rem;">{pred:,.2f}</div>
        </div>
        """, unsafe_allow_html=True)
        
        # Extrapolation download
        csv = input_df.copy()
        csv[f"Predicted_{target}"] = pred
        csv_bytes = csv.to_csv(index=False).encode('utf-8')
        
        st.download_button(
            label="Download Prediction Ticket",
            data=csv_bytes,
            file_name="pricenest_prediction.csv",
            mime="text/csv",
            use_container_width=True
        )
