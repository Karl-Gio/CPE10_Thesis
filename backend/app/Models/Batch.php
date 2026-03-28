<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    protected $fillable = [
        'batch_id', 
        'date_planted', 
        'predicted_days', 
        'actual_germination_date'
    ];
}
