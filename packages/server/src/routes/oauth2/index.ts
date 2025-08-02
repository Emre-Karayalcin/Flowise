/**
 * OAuth2 Authorization Code Flow Implementation
 *
 * This module implements a complete OAuth2 authorization code flow for Flowise credentials.
 * It supports Microsoft Graph and other OAuth2 providers.
 *
 * CREDENTIAL DATA STRUCTURE:
 * The credential's encryptedData should contain a JSON object with the following fields:
 *
 * Required fields:
 * - client_id: OAuth2 application client ID
 * - client_secret: OAuth2 application client secret
 *
 * Optional fields (provider-specific):
 * - tenant_id: Microsoft Graph tenant ID (if using Microsoft Graph)
 * - authorization_endpoint: Custom authorization URL (defaults to Microsoft Graph if tenant_id provided)
 * - token_endpoint: Custom token URL (defaults to Microsoft Graph if tenant_id provided)
 * - redirect_uri: Custom redirect URI (defaults to this callback endpoint)
 * - scope: OAuth2 scopes to request (e.g., "user.read mail.read")
 * - response_type: OAuth2 response type (defaults to "code")
 * - response_mode: OAuth2 response mode (defaults to "query")
 *
 * ENDPOINTS:
 *
 * 1. POST /api/v1/oauth2/authorize/:credentialId
 *    - Generates authorization URL for initiating OAuth2 flow
 *    - Uses credential ID as state parameter for security
 *    - Returns authorization URL to redirect user to
 *
 * 2. GET /api/v1/oauth2/callback
 *    - Handles OAuth2 callback with authorization code
 *    - Exchanges code for access token
 *    - Updates credential with token data
 *    - Supports Microsoft Graph and custom OAuth2 providers
 *
 * 3. POST /api/v1/oauth2/refresh/:credentialId
 *    - Refreshes expired access tokens using refresh token
 *    - Updates credential with new token data
 *
 * USAGE FLOW:
 * 1. Create a credential with OAuth2 configuration (client_id, client_secret, etc.)
 * 2. Call POST /oauth2/authorize/:credentialId to get authorization URL
 * 3. Redirect user to authorization URL
 * 4. User authorizes and gets redirected to callback endpoint
 * 5. Callback endpoint exchanges code for tokens and saves them
 * 6. Use POST /oauth2/refresh/:credentialId when tokens expire
 *
 * TOKEN STORAGE:
 * After successful authorization, the credential will contain additional fields:
 * - access_token: OAuth2 access token
 * - refresh_token: OAuth2 refresh token (if provided)
 * - token_type: Token type (usually "Bearer")
 * - expires_in: Token lifetime in seconds
 * - expires_at: Token expiry timestamp (ISO string)
 * - granted_scope: Actual scopes granted by provider
 * - token_received_at: When token was received (ISO string)
 */

import express from 'express'
import axios from 'axios'
import { Request, Response, NextFunction } from 'express'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import { decryptCredentialData, encryptCredentialData } from '../../utils'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { generateSuccessPage, generateErrorPage } from './templates'

const router = express.Router()

// Helper function to get OAuth config based on credential type
const getOAuthConfig = (credentialName: string, decryptedData: any) => {
    let { clientId, clientSecret, accessTokenUrl, redirect_uri, scope } = decryptedData

    // Special handling for Figma API
    if (credentialName === 'figmaApi') {
        clientId = clientId || process.env.FIGMA_CLIENT_ID
        clientSecret = process.env.FIGMA_CLIENT_SECRET || clientSecret
        accessTokenUrl = accessTokenUrl || 'https://api.figma.com/v1/oauth/token'
        scope = scope || 'file_read'
    }

    // Special handling for Notion API
    if (credentialName === 'notionApi') {
        clientId = clientId || process.env.NOTION_CLIENT_ID
        clientSecret = process.env.NOTION_CLIENT_SECRET || clientSecret
        accessTokenUrl = accessTokenUrl || 'https://api.notion.com/v1/oauth/token'
        // Notion doesn't require scope parameter in token request
    }

    // Special handling for Slack API
    if (credentialName === 'slackApi') {
        clientId = clientId || process.env.SLACK_CLIENT_ID
        clientSecret = process.env.SLACK_CLIENT_SECRET || clientSecret
        accessTokenUrl = accessTokenUrl || 'https://slack.com/api/oauth.v2.access'
        scope = scope || 'chat:write channels:read users:read'
    }

    // Special handling for Google OAuth2 services
    const googleServices = ['googleCalendarOAuth2', 'googleSheetsOAuth2', 'googleDocsOAuth2', 'gmailOAuth2', 'googleDriveOAuth2']

    if (googleServices.includes(credentialName)) {
        clientId = clientId || process.env.GOOGLE_CLIENT_ID
        clientSecret = process.env.GOOGLE_CLIENT_SECRET || clientSecret
        accessTokenUrl = accessTokenUrl || 'https://oauth2.googleapis.com/token'

        // Set default scopes if not provided
        if (!scope) {
            const defaultScopes = {
                googleCalendarOAuth2: 'https://www.googleapis.com/auth/calendar',
                googleSheetsOAuth2: 'https://www.googleapis.com/auth/spreadsheets',
                googleDocsOAuth2: 'https://www.googleapis.com/auth/documents',
                gmailOAuth2: 'https://www.googleapis.com/auth/gmail.readonly',
                googleDriveOAuth2: 'https://www.googleapis.com/auth/drive.file'
            }
            scope = defaultScopes[credentialName as keyof typeof defaultScopes] || 'https://www.googleapis.com/auth/drive.file'
        }
    }

    return { clientId, clientSecret, accessTokenUrl, redirect_uri, scope }
}

// Helper function to process token data based on credential type
const processTokenData = (credentialName: string, tokenData: any, decryptedData: any) => {
    const updatedCredentialData: any = {
        ...decryptedData,
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'bearer',
        token_received_at: new Date().toISOString()
    }

    const googleServices = ['googleCalendarOAuth2', 'googleSheetsOAuth2', 'googleDocsOAuth2', 'gmailOAuth2', 'googleDriveOAuth2']

    // Common token handling for Figma, Notion, Slack and Google services
    if (
        credentialName === 'figmaApi' ||
        credentialName === 'notionApi' ||
        credentialName === 'slackApi' ||
        googleServices.includes(credentialName)
    ) {
        if (tokenData.expires_in) {
            updatedCredentialData.expires_in = tokenData.expires_in
        }
        if (tokenData.refresh_token) {
            updatedCredentialData.refresh_token = tokenData.refresh_token
        }
        if (tokenData.scope) {
            updatedCredentialData.granted_scope = tokenData.scope
        }

        // Notion specific fields
        if (credentialName === 'notionApi') {
            if (tokenData.workspace_name) {
                updatedCredentialData.workspace_name = tokenData.workspace_name
            }
            if (tokenData.workspace_icon) {
                updatedCredentialData.workspace_icon = tokenData.workspace_icon
            }
            if (tokenData.workspace_id) {
                updatedCredentialData.workspace_id = tokenData.workspace_id
            }
            if (tokenData.bot_id) {
                updatedCredentialData.bot_id = tokenData.bot_id
            }
        }

        // Slack specific fields
        if (credentialName === 'slackApi') {
            if (tokenData.access_token) {
                updatedCredentialData.botToken = tokenData.access_token
            }

            if (tokenData.team) {
                updatedCredentialData.teamId = tokenData.team.id
                updatedCredentialData.team_name = tokenData.team.name
            }
            if (tokenData.enterprise) {
                updatedCredentialData.enterprise_id = tokenData.enterprise.id
                updatedCredentialData.enterprise_name = tokenData.enterprise.name
            }
            if (tokenData.authed_user) {
                updatedCredentialData.user_id = tokenData.authed_user.id
            }
            if (tokenData.bot_user_id) {
                updatedCredentialData.bot_user_id = tokenData.bot_user_id
            }
            if (tokenData.app_id) {
                updatedCredentialData.app_id = tokenData.app_id
            }
        }

        // Google specific fields (if any additional fields are needed)
        if (googleServices.includes(credentialName)) {
            // Google might return additional fields like id_token for OpenID Connect
            if (tokenData.id_token) {
                updatedCredentialData.id_token = tokenData.id_token
            }
        }
    } else {
        // Standard OAuth2 handling for other providers
        if (tokenData.expires_in) {
            updatedCredentialData.expires_in = tokenData.expires_in
        }
        if (tokenData.refresh_token) {
            updatedCredentialData.refresh_token = tokenData.refresh_token
        }
        Object.keys(tokenData).forEach((key) => {
            if (!updatedCredentialData.hasOwnProperty(key)) {
                updatedCredentialData[key] = tokenData[key]
            }
        })
    }

    // Calculate token expiry time
    if (tokenData.expires_in) {
        const expiryTime = new Date(Date.now() + tokenData.expires_in * 1000)
        updatedCredentialData.expires_at = expiryTime.toISOString()
    }

    return updatedCredentialData
}

// Initiate OAuth2 authorization flow
router.post('/authorize/:credentialId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { credentialId } = req.params

        const appServer = getRunningExpressApp()
        const credentialRepository = appServer.AppDataSource.getRepository(Credential)

        // Find credential by ID
        const credential = await credentialRepository.findOneBy({
            id: credentialId
        })

        if (!credential) {
            return res.status(404).json({
                success: false,
                message: 'Credential not found'
            })
        }

        // Decrypt the credential data to get OAuth configuration
        const decryptedData = await decryptCredentialData(credential.encryptedData)

        const {
            clientId,
            authorizationUrl,
            redirect_uri,
            scope,
            response_type = 'code',
            response_mode = 'query',
            additionalParameters = ''
        } = decryptedData

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Missing clientId in credential data'
            })
        }

        if (!authorizationUrl) {
            return res.status(400).json({
                success: false,
                message: 'No authorizationUrl specified in credential data'
            })
        }

        const defaultRedirectUri = `${req.protocol}://${req.get('host')}/api/v1/oauth2-credential/callback`
        const finalRedirectUri = redirect_uri || defaultRedirectUri

        const authParams = new URLSearchParams({
            client_id: clientId,
            response_type,
            response_mode,
            state: credentialId, // Use credential ID as state parameter
            redirect_uri: finalRedirectUri
        })

        if (scope) {
            authParams.append('scope', scope)
        }

        let fullAuthorizationUrl = `${authorizationUrl}?${authParams.toString()}`

        if (additionalParameters) {
            fullAuthorizationUrl += `&${additionalParameters}`
        }

        res.json({
            success: true,
            message: 'Authorization URL generated successfully',
            credentialId,
            authorizationUrl: fullAuthorizationUrl,
            redirectUri: finalRedirectUri
        })
    } catch (error) {
        next(
            new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `OAuth2 authorization error: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        )
    }
})

// OAuth2 callback endpoint
router.get('/callback', async (req: Request, res: Response) => {
    try {
        const { code, state, error, error_description } = req.query
        if (error) {
            const errorHtml = generateErrorPage(
                error as string,
                (error_description as string) || 'An error occurred',
                error_description ? `Description: ${error_description}` : undefined
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        if (!code || !state) {
            const errorHtml = generateErrorPage('Missing required parameters', 'Missing code or state', 'Please try again later.')

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        const appServer = getRunningExpressApp()
        const credentialRepository = appServer.AppDataSource.getRepository(Credential)

        // Find credential by state (assuming state contains the credential ID)
        const credential = await credentialRepository.findOneBy({
            id: state as string
        })

        if (!credential) {
            const errorHtml = generateErrorPage(
                'Credential not found',
                `Credential not found for the provided state: ${state}`,
                'Please try the authorization process again.'
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(404).send(errorHtml)
        }

        const decryptedData = await decryptCredentialData(credential.encryptedData)
        const { clientId, clientSecret, accessTokenUrl, redirect_uri, scope } = getOAuthConfig(credential.credentialName, decryptedData)

        if (!clientId) {
            const errorHtml = generateErrorPage(
                'Missing OAuth configuration',
                'Missing clientId or clientSecret',
                'Please check your credential setup and environment variables.'
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        let tokenUrl = accessTokenUrl
        if (!tokenUrl) {
            const errorHtml = generateErrorPage(
                'Missing token endpoint URL',
                'No Access Token URL specified in credential data',
                'Please check your credential configuration.'
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        const defaultRedirectUri = `${req.protocol}://${req.get('host')}/api/v1/oauth2-credential/callback`
        const finalRedirectUri = redirect_uri || defaultRedirectUri

            const tokenRequestData: any = {
                client_id: clientId,
                client_secret: clientSecret,
                code: code as string,
                grant_type: 'authorization_code',
                redirect_uri: finalRedirectUri
            }

            if (scope && credential.credentialName !== 'notionApi') {
                tokenRequestData.scope = scope
            }

        const tokenResponse = await axios.post(tokenUrl, new URLSearchParams(tokenRequestData).toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                }
        })

        const tokenData = tokenResponse.data

        // Use helper function to process token data
        const updatedCredentialData = processTokenData(credential.credentialName, tokenData, decryptedData)

        // Encrypt the updated credential data
        const encryptedData = await encryptCredentialData(updatedCredentialData)

        // Update the credential in the database
        await credentialRepository.update(credential.id, {
            encryptedData,
            updatedDate: new Date()
        })

        // Return HTML that closes the popup window on success
        const successHtml = generateSuccessPage(credential.id)

        res.setHeader('Content-Type', 'text/html')
        res.send(successHtml)
    } catch (error) {
        console.error('OAuth2 callback error:', error)
        if (axios.isAxiosError(error)) {
            const axiosError = error
            console.log('OAuth2 callback error:', axiosError.response?.data || axiosError.message)
            const errorHtml = generateErrorPage(
                axiosError.response?.data?.error || 'token_exchange_failed',
                axiosError.response?.data?.error_description || 'Token exchange failed',
                axiosError.response?.data?.error_description ? `Description: ${axiosError.response?.data?.error_description}` : undefined
            )

            res.setHeader('Content-Type', 'text/html')
            return res.status(400).send(errorHtml)
        }

        // Generic error HTML page
        const errorHtml = generateErrorPage(
            'An unexpected error occurred',
            'Please try again later.',
            error instanceof Error ? error.message : 'Unknown error'
        )

        res.setHeader('Content-Type', 'text/html')
        res.status(500).send(errorHtml)
    }
})

// Refresh OAuth2 access token
router.post('/refresh/:credentialId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { credentialId } = req.params

        const appServer = getRunningExpressApp()
        const credentialRepository = appServer.AppDataSource.getRepository(Credential)

        const credential = await credentialRepository.findOneBy({
            id: credentialId
        })

        if (!credential) {
            return res.status(404).json({
                success: false,
                message: 'Credential not found'
            })
        }

        const decryptedData = await decryptCredentialData(credential.encryptedData)
        const { clientId, clientSecret, accessTokenUrl, scope } = getOAuthConfig(credential.credentialName, decryptedData)
        const { refresh_token } = decryptedData

        if (!clientId || !clientSecret || !refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Missing required OAuth configuration: clientId, clientSecret, or refresh_token'
            })
        }

        let tokenUrl = accessTokenUrl
        if (!tokenUrl) {
            return res.status(400).json({
                success: false,
                message: 'No Access Token URL specified in credential data'
            })
        }

        console.log('Making token refresh request to:', tokenUrl)

        let tokenResponse

        // Special handling for Notion API refresh - uses JSON payload and Basic Auth
        if (credential.credentialName === 'notionApi') {
            if (!clientSecret) {
                console.error('[Notion OAuth] clientSecret missing, cannot proceed refresh');
                return res.status(400).json({
                    success: false,
                    message: 'Notion OAuth requires client secret for token refresh'
                })
            }

            const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
            const payload = {
                grant_type: 'refresh_token',
                refresh_token
            }

            tokenResponse = await axios.post(tokenUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Basic ${basicAuth}`,
                    'Notion-Version': '2022-06-28'
                }
            })
        } else {
            const refreshRequestData: any = {
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
                refresh_token
            }

            if (scope && credential.credentialName !== 'notionApi') {
                refreshRequestData.scope = scope
            }

            tokenResponse = await axios.post(tokenUrl, new URLSearchParams(refreshRequestData).toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                }
            })
        }

        const tokenData = tokenResponse.data

        // Use helper function to process token data
        const updatedCredentialData = processTokenData(credential.credentialName, tokenData, decryptedData)

        // Encrypt the updated credential data
        const encryptedData = await encryptCredentialData(updatedCredentialData)

        // Update the credential in the database
        await credentialRepository.update(credential.id, {
            encryptedData,
            updatedDate: new Date()
        })

        // Return success response
        res.json({
            success: true,
            message: 'OAuth2 token refreshed successfully',
            credentialId: credential.id,
            tokenInfo: {
                access_token: tokenData.access_token,
                token_type: tokenData.token_type,
                expires_in: tokenData.expires_in,
                has_new_refresh_token: !!tokenData.refresh_token,
                expires_at: updatedCredentialData.expires_at
            }
        })
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error
            return res.status(400).json({
                success: false,
                message: `Token refresh failed: ${axiosError.response?.data?.error_description || axiosError.message}`,
                details: axiosError.response?.data
            })
        }

        next(
            new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `OAuth2 token refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        )
    }
})

export default router
