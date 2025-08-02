import { INodeParams, INodeCredential } from '../src/Interface'
const scopes = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']

class GoogleCalendarOAuth2 implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]
    description: string

    constructor() {
        this.label = 'Google Calendar OAuth2'
        this.name = 'googleCalendarOAuth2'
        this.version = 1.0
        this.description =
            ''
        this.inputs = []
    }
}

module.exports = { credClass: GoogleCalendarOAuth2 }
