import pandas as pd
import numpy as np

# Set the number of rows for your dummy dataset
num_samples = 50 

data = {
    # Target 25.0°C - generating values around that range
    'Ambient_Temp_C': np.round(np.random.uniform(20.0, 30.0, num_samples), 2),
    
    # Target 70.0% - generating values around that range
    'Ambient_Hum_Percent': np.round(np.random.uniform(50.0, 85.0, num_samples), 2),
    
    # Light Intensity - generating typical indoor/greenhouse lux
    'Light_Intensity_lx': np.round(np.random.uniform(100.0, 800.0, num_samples), 1),
    
    # Target 30% - generating soil moisture
    'Soil_Moisture_Percent': np.round(np.random.uniform(15.0, 45.0, num_samples), 2),
    
    # Target 6.5 pH
    'Soil_pH': np.round(np.random.uniform(5.5, 7.5, num_samples), 1),
    
    # Pechay Count (Detecting)
    'Pechay_Count': np.random.randint(5, 25, num_samples)
}

# Create DataFrame
df_dummy = pd.DataFrame(data)

# Save to CSV
df_dummy.to_csv('pechay_dummy_data.csv', index=False)

print("Generated 50 rows of dummy data in 'pechay_dummy_data.csv'")
print(df_dummy.head())