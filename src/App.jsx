import { useState } from 'react'
import './App.css'

function App() {
  // State management - stores component data
  const [targetAmount, setTargetAmount] = useState('') // Target amount
  const [selectedCoins, setSelectedCoins] = useState([]) // Selected coin denominations
  const [result, setResult] = useState(null) // Calculation result
  const [isLoading, setIsLoading] = useState(false) // Loading state
  const [error, setError] = useState('') // Error message

  // Available coin denominations (as per requirements)
  const availableCoins = [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 50, 100, 1000]

  // Get precision info for selected coins
  const getPrecisionInfo = (coins) => {
    if (coins.length === 0) return null
    
    const minCoin = Math.min(...coins)
    let precision = 0
    let temp = minCoin
    while (temp < 1 && precision < 10) {
      temp *= 10
      precision++
    }
    
    return {
      minCoin,
      precision,
      step: minCoin
    }
  }

  // Validate amount precision based on selected coins
  const validateAmountPrecision = (amount, coins) => {
    const minCoin = Math.min(...coins)
    const sortedCoins = [...coins].sort((a, b) => a - b)
    
    // Check if amount is smaller than the smallest coin
    if (amount < minCoin) {
      throw new Error(`Target amount $${amount} is smaller than the smallest selected coin $${minCoin}`)
    }
    
    // Calculate the precision needed based on the smallest coin
    let precision = 0
    let temp = minCoin
    while (temp < 1 && precision < 10) {
      temp *= 10
      precision++
    }
    
    // Check if the amount has more decimal places than the smallest coin allows
    const amountStr = amount.toString()
    if (amountStr.includes('.')) {
      const decimalPlaces = amountStr.split('.')[1].length
      if (decimalPlaces > precision) {
        throw new Error(`Target amount has too many decimal places. With smallest coin $${minCoin}, maximum ${precision} decimal place${precision > 1 ? 's' : ''} allowed.`)
      }
    }
    
    // Check if the amount can be exactly represented with the selected coins
    // Convert to smallest unit to avoid floating point issues
    const amountInSmallestUnit = Math.round(amount / minCoin)
    const reconstructedAmount = amountInSmallestUnit * minCoin
    
    if (Math.abs(amount - reconstructedAmount) > 0.001) {
      throw new Error(`Target amount $${amount} cannot be exactly represented with smallest coin $${minCoin}`)
    }
  }

  // Handle calculate button click - call backend API
  const handleCalculate = async () => {
    setError('')
    setResult(null)
    setIsLoading(true)
    
    try {
      const amount = parseFloat(targetAmount)
      
      // Basic validation
      if (isNaN(amount) || amount <= 0 || amount > 10000) {
        throw new Error('Target amount must be between 0.01 and 10,000.00')
      }
      
      if (selectedCoins.length === 0) {
        throw new Error('Please select at least one coin denomination')
      }

      // Advanced validation based on selected coins
      validateAmountPrecision(amount, selectedCoins)

      // Call backend API with environment-specific base URL
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
      const response = await fetch(`${apiBaseUrl}/api/coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          totalAmount: amount,
          denominations: selectedCoins.sort((a, b) => a - b)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to calculate minimum coins`)
      }

      const responseData = await response.json()
      
      // Transform backend response to frontend format
      const coins = Object.entries(responseData.solution).map(([denomination, count]) => ({
        denomination: parseFloat(denomination),
        count: count
      })).sort((a, b) => a.denomination - b.denomination) // Sort by denomination ascending

      setResult({
        totalCoins: responseData.totalCoins,
        totalAmount: responseData.totalAmount,
        coins: coins
      })

    } catch (err) {
      console.error('API Error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle select all coins
  const handleSelectAll = () => {
    if (selectedCoins.length === availableCoins.length) {
      // If all coins are selected, deselect all
      setSelectedCoins([])
    } else {
      // Otherwise, select all coins
      setSelectedCoins([...availableCoins])
    }
  }

  return (
    <div className="app">
      <div className="container">
        <h1>💰 Coin Change Calculator</h1>
        <p className="description">
          Calculate the minimum number of coins needed to make up a target amount
        </p>

        {/* Error message display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Target amount input section */}
        <div className="input-section">
          <label htmlFor="target-amount">Target Amount (0.01-10,000.00):</label>
          <input
            id="target-amount"
            type="number"
            min={selectedCoins.length > 0 ? Math.min(...selectedCoins) : 0.01}
            max="10000"
            step={selectedCoins.length > 0 ? Math.min(...selectedCoins) : 0.01}
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="Enter target amount"
          />
          {/* Dynamic precision hint */}
          {selectedCoins.length > 0 && (
            <div className="input-hint">
              {(() => {
                const info = getPrecisionInfo(selectedCoins)
                return (
                  <span>
                    💡 With selected coins: minimum amount ${info.minCoin}, 
                    step ${info.step} (max {info.precision} decimal place{info.precision !== 1 ? 's' : ''})
                  </span>
                )
              })()}
            </div>
          )}
        </div>

        {/* Coin denomination selection section */}
        <div className="coins-section">
          <div className="coins-header">
            <label>Select Available Coin Denominations:</label>
            <button 
              type="button"
              className="select-all-btn"
              onClick={handleSelectAll}
            >
              {selectedCoins.length === availableCoins.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="coins-grid">
            {availableCoins.map(coin => (
              <label key={coin} className="coin-option">
                <input
                  type="checkbox"
                  checked={selectedCoins.includes(coin)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCoins([...selectedCoins, coin])
                    } else {
                      setSelectedCoins(selectedCoins.filter(c => c !== coin))
                    }
                  }}
                />
                ${coin}
              </label>
            ))}
          </div>
        </div>

        {/* Calculate button */}
        <button 
          className="calculate-btn"
          onClick={handleCalculate}
          disabled={!targetAmount || selectedCoins.length === 0 || isLoading}
        >
          {isLoading ? 'Calculating...' : 'Calculate Minimum Coins'}
        </button>

        {/* Result display section */}
        {result && (
          <div className="result-section">
            <h3>Calculation Result:</h3>
            
            <div className="total-info">
              Total: {result.totalCoins} coins to make ${result.totalAmount}
            </div>
            
            <div className="result-content">
              {result.coins.map(({ denomination, count }) => (
                <div key={denomination} className="coin-result">
                  <span className="coin-denomination">${denomination}</span>
                  <span className="coin-count">{count} coin{count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
