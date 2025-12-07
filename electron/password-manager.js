const { safeStorage, app } = require('electron')
const path = require('path')
const fs = require('fs')

// Path to the encrypted password file
function getPasswordFilePath() {
  const userData = app.getPath('userData')
  return path.join(userData, 'master-password-encrypted')
}

// Store the master password
function storeMasterPassword(password) {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return { success: false, error: 'Safe storage encryption not available' }
    }

    const encryptedPassword = safeStorage.encryptString(password)
    const filePath = getPasswordFilePath()
    
    fs.writeFileSync(filePath, encryptedPassword)
    console.log('Master password stored securely')
    
    return { success: true }
  } catch (error) {
    console.error('Failed to store master password:', error)
    return { success: false, error: error.message }
  }
}

// Retrieve the master password
function getMasterPassword() {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return { success: false, password: null, error: 'Safe storage encryption not available' }
    }

    const filePath = getPasswordFilePath()
    
    if (!fs.existsSync(filePath)) {
      return { success: false, password: null, error: 'No master password found' }
    }

    const encryptedPassword = fs.readFileSync(filePath)
    const password = safeStorage.decryptString(encryptedPassword)
    
    return { success: true, password: password }
  } catch (error) {
    console.error('Failed to retrieve master password:', error)
    return { success: false, password: null, error: error.message }
  }
}

// Verify the master password
function verifyMasterPassword(inputPassword) {
  const result = getMasterPassword()
  
  if (!result.success) {
    // No stored password; treat as verification failure
    return false
  }
  
  return result.password === inputPassword
}

// Update the master password
function updateMasterPassword(oldPassword, newPassword) {
  try {
    // Validate the old password
    if (!verifyMasterPassword(oldPassword)) {
      return { success: false, error: 'Old password is incorrect' }
    }
    
    // Persist the new password
    const storeResult = storeMasterPassword(newPassword)
    if (!storeResult.success) {
      return storeResult
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to update master password:', error)
    return { success: false, error: error.message }
  }
}

// Check whether a master password exists
function hasMasterPassword() {
  const filePath = getPasswordFilePath()
  return fs.existsSync(filePath)
}

// Remove the master password file
function removeMasterPassword() {
  try {
    const filePath = getPasswordFilePath()
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log('Master password removed')
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to remove master password:', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  storeMasterPassword,
  getMasterPassword,
  verifyMasterPassword,
  updateMasterPassword,
  hasMasterPassword,
  removeMasterPassword
}
