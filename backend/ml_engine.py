import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, TargetEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error

def auto_detect_columns(df: pd.DataFrame):
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
        if 'price' in c or 'cost' in c or 'amount' in c or 'value' in c or 'target' in c:
            if mapping['target'] is None:
                mapping['target'] = orig_col
            continue
        if 'loc' in c or 'sector' in c or 'area' in c and 'name' in c or 'city' in c or 'neighborhood' in c:
            if mapping['location'] is None:
                mapping['location'] = orig_col
        if 'area' in c or 'sqft' in c or 'size' in c or 'sq ft' in c or 'sq_ft' in c:
            if mapping['area'] is None:
                mapping['area'] = orig_col
        if 'bed' in c or 'bhk' in c:
            if mapping['bedrooms'] is None:
                mapping['bedrooms'] = orig_col
        if 'bath' in c:
            if mapping['bathrooms'] is None:
                mapping['bathrooms'] = orig_col
        mapping['features'].append(orig_col)
        
    return mapping

def train_model(df, target_col, features):
    df_clean = df.dropna(subset=[target_col]).copy()
    y = df_clean[target_col]
    X = df_clean[features]
    
    num_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    cat_cols = X.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
    
    num_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    cat_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('encoder', TargetEncoder(target_type='continuous'))
    ])
    
    transformers = []
    if num_cols: transformers.append(('num', num_transformer, num_cols))
    if cat_cols: transformers.append(('cat', cat_transformer, cat_cols))
        
    preprocessor = ColumnTransformer(transformers=transformers)
        
    model = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))
    ])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)
    
    importances = model.named_steps['regressor'].feature_importances_
    all_features = num_cols + cat_cols
    feat_imp = []
    for f, imp in zip(all_features, importances):
        feat_imp.append({"feature": f, "importance": float(imp)})
        
    feat_imp.sort(key=lambda x: x["importance"], reverse=True)
    
    return model, df_clean, float(r2), float(mae), feat_imp
