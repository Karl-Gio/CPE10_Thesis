<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestingParameter extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ambient_temp',
        'humidity',
        'soil_moisture',
        'soil_temp',
        'uv',
        'led',
        'duration',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'ambient_temp' => 'float',
        'humidity' => 'float',
        'soil_moisture' => 'float',
        'soil_temp' => 'float',
        'uv' => 'boolean',
        'led' => 'boolean',
        'duration' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function values()
    {
        return $this->hasMany(TestingParameterValue::class);
    }
}