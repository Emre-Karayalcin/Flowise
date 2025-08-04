import { Request, Response, NextFunction } from 'express'
import { utilBuildChatflow } from '../../utils/buildChatflow'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { getErrorMessage } from '../../errors/utils'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { MODE } from '../../Interface'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { WorkspaceUser } from '../../enterprise/database/entities/workspace-user.entity'

const checkWorkspaceUserCredits = async (chatflowId: string): Promise<void> => {
    try {
        const appDataSource = getRunningExpressApp().AppDataSource
        
        const chatflow = await appDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        
        if (!chatflow || !chatflow.workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                'Chatflow or workspace not found'
            )
        }
        
        const workspaceUser = await appDataSource
            .getRepository(WorkspaceUser)
            .createQueryBuilder('wu')
            .leftJoinAndSelect('wu.user', 'user')
            .where('wu.workspaceId = :workspaceId', { workspaceId: chatflow.workspaceId })
            .orderBy('wu.createdDate', 'ASC')
            .getOne()
            
        if (!workspaceUser || !workspaceUser.user) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                'No user found in workspace'
            )
        }
        
        const userCredits = workspaceUser.user.credits || 0
        const requiredCredits = 10
        
        if (userCredits < requiredCredits) {
            throw new InternalFlowiseError(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Insufficient credits. Required: ${requiredCredits}, Available: ${userCredits}. Please contact your administrator to top up your credits.`
            )
        }
        
    } catch (error) {
        if (error instanceof InternalFlowiseError) {
            throw error
        }
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error checking user credits: ${getErrorMessage(error)}`
        )
    }
}

const createInternalPrediction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const chatflowId = req.params.id || req.body.chatflowId
        
        if (!chatflowId) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                'Chatflow ID is required'
            )
        }
        
        await checkWorkspaceUserCredits(chatflowId)
        
        if (req.body.streaming || req.body.streaming === 'true') {
            createAndStreamInternalPrediction(req, res, next)
            return
        } else {
            const apiResponse = await utilBuildChatflow(req, true)
            if (apiResponse) return res.json(apiResponse)
        }
    } catch (error) {
        next(error)
    }
}

// Send input message and stream prediction result using SSE (Internal)
const createAndStreamInternalPrediction = async (req: Request, res: Response, next: NextFunction) => {
    const chatId = req.body.chatId
    const sseStreamer = getRunningExpressApp().sseStreamer

    try {
        const chatflowId = req.params.id || req.body.chatflowId
        
        if (!chatflowId) {
            throw new InternalFlowiseError(
                StatusCodes.BAD_REQUEST,
                'Chatflow ID is required'
            )
        }
        
        await checkWorkspaceUserCredits(chatflowId)
        
        sseStreamer.addClient(chatId, res)
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        if (process.env.MODE === MODE.QUEUE) {
            getRunningExpressApp().redisSubscriber.subscribe(chatId)
        }

        const apiResponse = await utilBuildChatflow(req, true)
        sseStreamer.streamMetadataEvent(apiResponse.chatId, apiResponse)
    } catch (error) {
        if (chatId) {
            sseStreamer.streamErrorEvent(chatId, getErrorMessage(error))
        }
        next(error)
    } finally {
        sseStreamer.removeClient(chatId)
    }
}
export default {
    createInternalPrediction
}
