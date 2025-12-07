/**
 * AES-256-GCM decryption helper
 * Compatible with aes-gcm.js encryption format
 */

const AAD = new TextEncoder().encode('Peta Consol')

/**
 * Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Decrypt AES-256-GCM encrypted data
 * @param encryptedData - Encrypted data object {iv, tag, ciphertext}
 * @param keyString - 32-byte key string (e.g., 88903baf62eb9d73f307c545198e5356)
 * @returns Decrypted plaintext string or null on failure
 */
export async function decryptAESGCM(
  encryptedData: { iv: string; tag: string; ciphertext: string },
  keyString: string
): Promise<string | null> {
  try {
    // Validate key length
    const keyBuffer = new TextEncoder().encode(keyString)
    if (keyBuffer.length !== 32) {
      console.error('Key must be exactly 32 bytes (AES-256)')
      return null
    }

    // Parse encrypted data
    const iv = base64ToArrayBuffer(encryptedData.iv)
    const tag = base64ToArrayBuffer(encryptedData.tag)
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext)

    // Combine ciphertext and tag (required by WebCrypto)
    const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength)
    combined.set(new Uint8Array(ciphertext), 0)
    combined.set(new Uint8Array(tag), ciphertext.byteLength)

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: AAD,
        tagLength: 128
      },
      cryptoKey,
      combined
    )

    // Convert to string
    const plaintext = new TextDecoder().decode(decrypted)
    return plaintext
  } catch (error) {
    console.error('AES-GCM decryption failed:', error)
    return null
  }
}

/**
 * Decrypt and parse an authConfig string
 * @param authConfigStr - Encrypted config string (JSON: {iv, tag, ciphertext})
 * @param key - Decryption key (defaults to MD5 hash of "Peta Console")
 * @returns Decrypted config array, or null on failure
 */
export async function decryptAuthConfig(
  authConfigStr: string,
  key: string = '88903baf62eb9d73f307c545198e5356'
): Promise<Array<{ key: string; value: string; dataType: number }> | null> {
  try {
    // Parse encrypted data
    const encryptedData = JSON.parse(authConfigStr)

    // Decrypt
    const plaintext = await decryptAESGCM(encryptedData, key)
    if (!plaintext) {
      return null
    }

    // Parse config array
    const config = JSON.parse(plaintext)
    return config
  } catch (error) {
    console.error('Failed to decrypt auth config:', error)
    return null
  }
}

/**
 * Extract a value from the decrypted config array
 * @param config - Decrypted config array
 * @param keyName - Key name to extract (e.g., YOUR_CLIENT_ID)
 * @returns Corresponding value or undefined if missing
 */
export function getConfigValue(
  config: Array<{ key: string; value: string; dataType: number }>,
  keyName: string
): string | undefined {
  const item = config.find((c) => c.key === keyName)
  return item?.value
}
