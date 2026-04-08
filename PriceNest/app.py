import streamlit as st
from core.styles import apply_custom_styles

st.set_page_config(
    page_title="PriceNest | Real Estate Intelligence",
    page_icon="🏘️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Apply dynamic custom styling immediately
apply_custom_styles()

st.sidebar.markdown(f'<h2 class="gradient-text" style="font-size: 1.8rem; margin-top: 0;">PriceNest</h2>', unsafe_allow_html=True)
st.sidebar.caption("v2.0 • Generalized Prediction Engine")

st.sidebar.divider()

# Navigation Selection
pages = ["Home", "Predict Price", "Analytics", "Insights", "Upload Dataset", "Settings"]
selected_page = st.sidebar.radio("Navigate", pages)

st.sidebar.divider()

# Theme toggle in sidebar
theme_col1, theme_col2 = st.sidebar.columns([3, 1])
with theme_col1:
    st.write("Light Mode")
with theme_col2:
    is_light = st.session_state.get("theme") == "light"
    # st.toggle returns True/False
    new_theme_light = st.toggle("", value=is_light, key="theme_toggle")
    
    # Check if we need to switch logic
    if new_theme_light and st.session_state.theme != "light":
        st.session_state.theme = "light"
        st.rerun()
    elif not new_theme_light and st.session_state.theme != "dark":
        st.session_state.theme = "dark"
        st.rerun()


# Page Routing
if selected_page == "Home":
    import modules.home as home
    home.run()
    
elif selected_page == "Upload Dataset":
    import modules.upload as upload
    upload.run()
    
elif selected_page == "Predict Price":
    import modules.predict as predict
    predict.run()

elif selected_page == "Analytics":
    import modules.analytics as analytics
    analytics.run()

elif selected_page == "Insights":
    import modules.insights as insights
    insights.run()
    
elif selected_page == "Settings":
    st.markdown('<h2 class="gradient-text">Platform Settings</h2>', unsafe_allow_html=True)
    st.write("Current Session details cached locally.")
    if 'curr_file' in st.session_state:
        st.success(f"Attached Training Context: **{st.session_state.curr_file}**")
        if st.button("Flush Cache / Reset Engine"):
            for key in list(st.session_state.keys()):
                if key != "theme": 
                    del st.session_state[key]
            st.rerun()
    else:
        st.warning("No dataset currently attached to the memory cache.")
