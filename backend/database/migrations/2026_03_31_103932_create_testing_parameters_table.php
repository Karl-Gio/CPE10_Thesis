<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testing_parameters', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->string('batch')->unique();

            $table->decimal('ambient_temp', 8, 2)->nullable();
            $table->decimal('humidity', 8, 2)->nullable();
            $table->decimal('soil_moisture', 8, 2)->nullable();
            $table->decimal('soil_temp', 8, 2)->nullable();

            $table->boolean('uv')->default(false);
            $table->boolean('led')->default(false);
            $table->integer('duration')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testing_parameters');
    }
};