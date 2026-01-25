<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Parameter extends Model
{
    use HasFactory;

    // Laravel automatically assumes the table is 'parameters', 
    // but you can define it explicitly if you want:
    protected $table = 'parameters';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'Ambient_Temperature',
        'Relative_Humidity',
        'Soil_Temperature',
        'Soil_Moisture',
        'Soil_pH',
        'Light_Intensity',
        'Germinated',
    ];

    /**
     * The attributes that should be cast to native types.
     * This automatically converts 0/1 to false/true when you access it.
     */
    protected $casts = [
        'Germinated' => 'boolean',
        'Ambient_Temperature' => 'decimal:2',
        'Relative_Humidity' => 'decimal:2',
        'Soil_Temperature' => 'decimal:2',
        'Soil_Moisture' => 'decimal:2',
        'Soil_pH' => 'decimal:2',
        'Light_Intensity' => 'decimal:2',
    ];
}