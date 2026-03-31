<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TestingParameter extends Model
{
    protected $fillable = [
        'batch',
        'ambient_temp',
        'ambient_humidity',
        'soil_moisture',
        'soil_temp',
        'uv',
        'led',
        'duration'
    ];

    protected $casts = [
        'uv' => 'boolean',
        'led' => 'boolean',
    ];

     public function values()
    {
        return $this->hasMany(TestingParameterValue::class);
    }
}