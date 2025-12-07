const crypto = require('crypto')

// Derive an encryption key from the master password
function deriveKey(masterPassword) {
  // Fixed salt so identical passwords derive the same key
  const salt = 'peta-desk-token-encryption-salt'
  return crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256')
}

// Encrypt a token
function encryptToken(token, masterPassword) {
  try {
    const key = deriveKey(masterPassword)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
    
    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Return iv + encrypted hex
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Failed to encrypt token:', error)
    throw error
  }
}

// Decrypt a token
function decryptToken(encryptedToken, masterPassword) {
  try {
    const key = deriveKey(masterPassword)
    const parts = encryptedToken.split(':')
    
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted token format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Failed to decrypt token:', error)
    throw error
  }
}

module.exports = {
  encryptToken,
  decryptToken
}
