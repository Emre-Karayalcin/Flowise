import { Request, Response, NextFunction } from 'express'
import _ from 'lodash'
import nodesService from '../../services/nodes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getWorkspaceSearchOptionsFromReq } from '../../enterprise/utils/ControllerServiceUtils'

const getAllowedToolNames = () => [
    'customTool',
    'gmail',
    'googleCalendarTool',
    'googleDocsTool',
    'googleDriveTool',
    'googleCustomSearch',
    'googleSheetsTool',
    'readFile',
    'requestsDelete',
    'requestsGet',
    'requestsPost',
    'requestsPut',
    'writeFile'
]

const getAllowedToolMCPNames = () => ['slackMCP']

const getAllowedLLMSNames = () => ['openAI']

const getAllowedChatModelNames = () => ['chatOpenAI', 'chatOpenAICustom']

const filterToolsByCategory = (nodes: any[]) => {
    const allowedNames = getAllowedToolNames()
    const allowedMCPNames = getAllowedToolMCPNames()
    return nodes.filter((node) => {
        if (node.category === 'Tools') {
            return allowedNames.includes(node.name)
        }
        if (node.category === 'Tools (MCP)') {
            return allowedMCPNames.includes(node.name)
        }
        if (node.category === 'LLMs') {
            return getAllowedLLMSNames().includes(node.name)
        }
        if (node.category === 'Chat Models') {
            return getAllowedChatModelNames().includes(node.name)
        }
        return true
    })
}

const getAllNodes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let apiResponse = await nodesService.getAllNodes()
        apiResponse = filterToolsByCategory(apiResponse)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getNodeByName = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.name) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: nodesController.getNodeByName - name not provided!`)
        }
        const apiResponse = await nodesService.getNodeByName(req.params.name)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getNodesByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.name === 'undefined' || req.params.name === '') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodesController.getNodesByCategory - name not provided!`
            )
        }
        const name = _.unescape(req.params.name)
        const apiResponse = await nodesService.getAllNodesForCategory(name)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSingleNodeIcon = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.name) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: nodesController.getSingleNodeIcon - name not provided!`)
        }
        const apiResponse = await nodesService.getSingleNodeIcon(req.params.name)
        return res.sendFile(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSingleNodeAsyncOptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodesController.getSingleNodeAsyncOptions - body not provided!`
            )
        }
        if (typeof req.params === 'undefined' || !req.params.name) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodesController.getSingleNodeAsyncOptions - name not provided!`
            )
        }
        const body = req.body
        const loadMethod = body.loadMethod || 'listTools'
        console.log('loadMethod', loadMethod)

        body.searchOptions = getWorkspaceSearchOptionsFromReq(req)
        const apiResponse = await nodesService.getSingleNodeAsyncOptions(req.params.name, body)
        if (loadMethod === 'listTools') {
            const allowedToolNames = [
                'customTool',
                'gmail',
                'googleCalendarTool',
                'googleDocsTool',
                'googleDriveTool',
                'googleCustomSearch',
                'googleSheetsTool',
                'slackMCP',
                'readFile',
                'requestsDelete',
                'requestsGet',
                'requestsPost',
                'requestsPut',
                'writeFile'
            ]

            const filteredResponse = apiResponse.filter((tool: any) => allowedToolNames.includes(tool.name))
            return res.json(filteredResponse)
        }
        
        if (loadMethod === 'listModels') {
            const allowedModelNames = [
                'chatOpenAI',
                'chatOpenAICustom',
                'chatAnthropic',
                'chatGoogleGenerativeAI',
                'chatDeepseek',
                'groqChat',
                'chatPerplexity'
            ]
            const filteredResponse = apiResponse.filter((tool: any) => allowedModelNames.includes(tool.name))

            return res.json(filteredResponse)
        }

        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const executeCustomFunction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodesController.executeCustomFunction - body not provided!`
            )
        }
        const orgId = req.user?.activeOrganizationId
        const workspaceId = req.user?.activeWorkspaceId
        const apiResponse = await nodesService.executeCustomFunction(req.body, workspaceId, orgId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllNodes,
    getNodeByName,
    getSingleNodeIcon,
    getSingleNodeAsyncOptions,
    executeCustomFunction,
    getNodesByCategory
}
