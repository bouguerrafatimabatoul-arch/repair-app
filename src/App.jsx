import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Logged in!')
  }

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Account created! You can now log in.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-2">🔧 Repair Requests</h1>
        <p className="text-gray-500 text-sm mb-6">Student maintenance portal</p>
        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Email"
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Password"
          type="password"
          onChange={e => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-2 rounded mb-2 hover:bg-blue-700"
        >
          Login
        </button>
        <button
          onClick={handleSignup}
          className="w-full border border-blue-600 text-blue-600 p-2 rounded hover:bg-blue-50"
        >
          Create Account
        </button>
        {message && (
          <p className="mt-3 text-sm text-center text-gray-500">{message}</p>
        )}
      </div>
    </div>
  )
}