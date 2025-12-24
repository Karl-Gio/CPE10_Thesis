<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    // REGISTER
    public function register(Request $request)
    {
        // 1. Validate the incoming data
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed', // 'confirmed' checks password_confirmation
        ]);

        // 2. Create the user
        $user = User::create([
            'name' => $validated['name'],
            'password' => Hash::make($validated['password']),
        ]);

        // 3. Create a token for them immediately
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
            'token' => $token
        ], 201);
    }

    // LOGIN
    public function login(Request $request)
    {
        // 1. Validate inputs
        $request->validate([
            'name' => 'required',
            'password' => 'required',
        ]);

        // 2. Attempt login using 'name' (mapped from the 'name' field in React)
        // Your React form sends { name: "Josh", password: "..." }
        // So we check the 'name' column in DB against $request->name
        $user = User::where('name', $request->name)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid login credentials'
            ], 401);
        }

        // 3. Generate Token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login success',
            'user' => $user,
            'token' => $token
        ]);
    }

    // LOGOUT
    public function logout(Request $request)
    {
        // Delete the token used for the current request
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }
}