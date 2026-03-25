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
        'batch',
        'ambientTemp',
        'ambientHum',
        'soilMoisture',
        'soilTemp',
        'uvStart',
        'uvDuration',
        'ledStart',
        'ledDuration',
        'is_active',
    ];

    /**
     * Ang $casts ay sinisiguro na ang data type ay tama
     * paglabas ng database (JSON response).
     */
    protected $casts = [
        'ambientTemp'  => 'float',
        'ambientHum'   => 'float',
        'soilMoisture' => 'float',
        'soilTemp'     => 'float',
        'uvDuration'   => 'integer',
        'ledDuration'  => 'integer',
        'is_active'    => 'boolean',
    ];

    /**
     * Link pabalik sa User na nag-set ng configuration na ito.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}