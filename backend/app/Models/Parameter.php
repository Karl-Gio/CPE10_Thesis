<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Parameter extends Model
{
    use HasFactory;

    protected $table = 'parameters';

    protected $fillable = [
        'batch_id',
        'ambient_temp',
        'humidity',
        'soil_temp',
        'soil_moisture',
        'light_intensity',
        'pechay_count',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'batch_id' => 'integer',
        'ambient_temp' => 'float',
        'humidity' => 'float',
        'soil_temp' => 'float',
        'soil_moisture' => 'float',
        'light_intensity' => 'float',
        'pechay_count' => 'integer',
    ];

    public function batch()
    {
        return $this->belongsTo(Batch::class);
    }
}