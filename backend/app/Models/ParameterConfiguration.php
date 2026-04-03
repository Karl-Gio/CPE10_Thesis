<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParameterConfiguration extends Model
{
    use HasFactory;

    protected $table = 'parameter_configurations';

    protected $fillable = [
        'user_id',
        'batch_id',
        'ambient_temp',
        'humidity',
        'soil_moisture',
        'soil_temp',
        'uv_start',
        'uv_duration',
        'led_start',
        'led_duration',
        'is_active',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'batch_id' => 'integer',
        'ambient_temp' => 'float',
        'humidity' => 'float',
        'soil_moisture' => 'float',
        'soil_temp' => 'float',
        'uv_duration' => 'integer',
        'led_duration' => 'integer',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }
}