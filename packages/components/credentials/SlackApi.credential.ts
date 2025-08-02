import { INodeParams, INodeCredential } from '../src/Interface'

class SlackApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Slack API'
        this.name = 'slackApi'
        this.version = 1.0
        this.description =
            ''
        this.inputs = []
    }
}

module.exports = { credClass: SlackApi }
