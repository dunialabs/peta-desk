/**
 * Socket.IO types and constants aligned with the peta-core backend.
 */

/**
 * Socket event names
 */
const SocketEvents = {
  // Client → Server
  CLIENT_MESSAGE: 'client-message',
  CLIENT_INFO: 'client-info',
  SET_CAPABILITIES: 'set_capabilities',
  SOCKET_RESPONSE: 'socket_response',

  // Server → Client
  NOTIFICATION: 'notification',
  ACK: 'ack',
  ERROR: 'error',
  ASK_USER_CONFIRM: 'ask_user_confirm',
  ASK_USER_SELECT: 'ask_user_select',
  GET_CLIENT_STATUS: 'get_client_status',
  GET_CURRENT_PAGE: 'get_current_page',
  GET_CLIENT_CONFIG: 'get_client_config',
  GET_CONNECTION_INFO: 'get_connection_info',
  GET_CAPABILITIES: 'get_capabilities',

  // Socket.IO built-in events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  CONNECT_ERROR: 'connect_error'
}

/**
 * Notification types
 */
const NotificationTypes = {
  // User management
  USER_DISABLED: 'user_disabled',
  USER_ENABLED: 'user_enabled',
  USER_EXPIRED: 'user_expired',
  USER_DELETED: 'user_deleted',

  // Permissions
  PERMISSION_CHANGED: 'permission_changed',
  PERMISSION_REVOKED: 'permission_revoked',

  // System messages
  SYSTEM_MESSAGE: 'system_message',
  SYSTEM_MAINTENANCE: 'system_maintenance',
  SYSTEM_UPDATE: 'system_update',

  // Business messages
  BUSINESS_MESSAGE: 'business_message',
  TASK_NOTIFICATION: 'task_notification',

  // Server status
  SERVER_STATUS_CHANGE: 'server_status_change',
  MCP_SERVER_ONLINE: 'mcp_server_online',
  MCP_SERVER_OFFLINE: 'mcp_server_offline'
}

/**
 * Socket action types
 */
const SocketActionType = {
  // User confirmation (1000-1999)
  ASK_USER_CONFIRM: 1001,
  ASK_USER_SELECT: 1002,

  // Client status queries (2000-2999)
  GET_CLIENT_STATUS: 2001,
  GET_CURRENT_PAGE: 2002,
  GET_CLIENT_CONFIG: 2003,
  GET_CONNECTION_INFO: 2004,

  // Capabilities (3000-3999)
  GET_CAPABILITIES: 3001
}

/**
 * Socket error codes
 */
const SocketErrorCode = {
  // General errors (1000-1099)
  TIMEOUT: 1001,
  USER_OFFLINE: 1002,
  INVALID_REQUEST: 1003,
  UNKNOWN_ACTION: 1004,

  // Client errors (1100-1199)
  CLIENT_ERROR: 1101,
  USER_REJECTED: 1102,
  USER_CANCELLED: 1103,
  PERMISSION_DENIED: 1104,

  // Server errors (1200-1299)
  SERVER_ERROR: 1201,
  SERVICE_UNAVAILABLE: 1202
}

/**
 * Create a Socket request object
 * @param {string} requestId - request ID
 * @param {number} action - action type
 * @param {*} data - request payload
 * @returns {Object} Socket request object
 */
function createSocketRequest(requestId, action, data) {
  return {
    requestId,
    action,
    data,
    timestamp: Date.now()
  }
}

/**
 * Create a Socket response object
 * @param {string} requestId - request ID
 * @param {boolean} success - success flag
 * @param {*} data - response payload
 * @param {Object} error - error detail
 * @returns {Object} Socket response object
 */
function createSocketResponse(requestId, success, data = null, error = null) {
  return {
    requestId,
    success,
    data,
    error,
    timestamp: Date.now()
  }
}

module.exports = {
  SocketEvents,
  NotificationTypes,
  SocketActionType,
  SocketErrorCode,
  createSocketRequest,
  createSocketResponse
}
