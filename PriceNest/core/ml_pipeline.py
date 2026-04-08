import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, TargetEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

def auto_detect_columns(df):
    cols = [str(c).lower() for c in df.columns]
    mapping = {
        'target': None,
        'location': None,
        'area': None,
        'bedrooms': None,
        'bathrooms': None,
        'features': []
    }
    
    for idx, c in enumerate(cols):
        orig_col = df.columns[idx]
        
        # Heuristics for Price Target
        if 'price' in c or 'cost' in c or 'amount' in c or 'value' in c or 'target' in c:
            if mapping['target'] is None:
                mapping['target'] = orig_col
            continue
            
        # Heuristics for Location
        if 'loc' in c or 'sector' in c or 'area_name' in c or 'city' in c or 'neighborhood' in c:
            if mapping['location'] is None:
                mapping['location'] = orig_col
                
        # Heuristics for Area / Size
        if 'area' in c or 'sqft' in c or 'size' in c or 'sq ft' in c or 'sq_ft' in c:
            if mapping['area'] is None:
                mapping['area'] = orig_col
                
        # Heuristics for Bedrooms
        if 'bed' in c or 'bhk' in c:
            if mapping['bedrooms'] is None:
                mapping['bedrooms'] = orig_col
                
        # Heuristics for Bathrooms
        if 'bath' in c:
            if mapping['bathrooms'] is None:
                mapping['bathrooms'] = orig_col
                
        mapping['features'].append(orig_col)
        
    return mapping

def train_dynamic_model(df, target_col, selected_features):
    # Filter and prepare X and y securely
    df_clean = df.dropna(subset=[target_col]).copy()
    y = df_clean[target_col]
    X = df_clean[selected_features]
    
    # Identify dtypes intelligently
    num_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    cat_cols = X.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
    
    # Safely apply transforms
    num_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    # TargetEncoder works great with high cardinality locations without exploding dimensions
    cat_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', TargetEncoder(target_type='continuous'))
    ])
    
    transformers = []
    if num_cols:
        transformers.append(('num', num_transformer, num_cols))
    if cat_cols:
        transformers.append(('cat', cat_transformer, cat_cols))
        
    preprocessor = ColumnTransformer(transformers=transformers)
        
    # Full Model Pipeline using RandomForest
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))
    ])
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train
    model.fit(X_train, y_train)
    
    # Predict and evaluate
    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)
    
    # Calculate Feature Importances mapped globally
    all_features = num_cols + cat_cols
    importances = model.named_steps['regressor'].feature_importances_
    
    feat_imp = pd.DataFrame({'Feature': all_features, 'Importance': importances})
    feat_imp = feat_imp.sort_values(by='Importance', ascending=False)
    
    return model, r2, mae, feat_imp, df_clean
