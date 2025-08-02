import { INodeParams, INodeCredential } from '../src/Interface'

class NotionApi implements INodeCredential {
    label: string
    name: string
    version: number
    description: string
    inputs: INodeParams[]

    constructor() {
        this.label = 'Notion API'
        this.name = 'notionApi'
        this.version = 1.0
        this.description =
            ''
        this.inputs = []
    }
}

module.exports = { credClass: NotionApi }
