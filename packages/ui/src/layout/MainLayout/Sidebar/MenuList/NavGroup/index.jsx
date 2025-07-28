import PropTypes from 'prop-types'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Divider, List, Typography } from '@mui/material'

// project imports
import NavItem from '../NavItem'
import NavCollapse from '../NavCollapse'
import { useAuth } from '@/hooks/useAuth'
import { Available } from '@/ui-component/rbac/available'

// ==============================|| SIDEBAR MENU LIST GROUP ||============================== //

const NavGroup = ({ item }) => {
    const theme = useTheme()
    const { hasPermission, hasDisplay } = useAuth()

    const listItems = (menu, level = 1) => {
        // Filter based on display and permission
        if (!shouldDisplayMenu(menu)) return null

        // Handle item and group types
        switch (menu.type) {
            case 'collapse':
                return <NavCollapse key={menu.id} menu={menu} level={level} />
            case 'item':
                return <NavItem key={menu.id} item={menu} level={level} navType='MENU' />
            default:
                return (
                    <Typography key={menu.id} variant='h6' color='error' align='center'>
                        Menu Items Error
                    </Typography>
                )
        }
    }

    const shouldDisplayMenu = (menu) => {
        // Handle permission check
        if (menu.permission && !hasPermission(menu.permission)) {
            return false // Do not render if permission is lacking
        }

        // If `display` is defined, check against cloud/enterprise conditions
        if (menu.display) {
            const shouldsiplay = hasDisplay(menu.display)
            return shouldsiplay
        }

        // If `display` is not defined, display by default
        return true
    }

    const renderPrimaryGroup = () => {
        const primaryGroup = item.children.find((child) => child.id === 'primary')
        if (!primaryGroup) return null
        const children = primaryGroup.children.filter((menu) => shouldDisplayMenu(menu))
        if (children.length === 0) return null
        return { ...primaryGroup, children }
    }

    const renderNonPrimaryGroups = () => {
        let nonprimaryGroups = item.children.filter((child) => child.id !== 'primary')
        // Display chilren based on permission and display
        nonprimaryGroups = nonprimaryGroups.map((group) => {
            const children = group.children.filter((menu) => shouldDisplayMenu(menu))
            return { ...group, children }
        })
        // Get rid of group with empty children
        nonprimaryGroups = nonprimaryGroups.filter((group) => group.children.length > 0)
        return nonprimaryGroups
    }

    return (
        <>
            {renderPrimaryGroup() && (
                <Available permission={renderPrimaryGroup().children.map((menu) => menu.permission).join(',')}>
                    <List
                        subheader={
                            renderPrimaryGroup().title && (
                                <Typography variant='caption' sx={{ ...theme.typography.menuCaption, mb: 0.5 }} display='block'>
                                    {renderPrimaryGroup().title}
                                    {renderPrimaryGroup().caption && (
                                        <Typography variant='caption' sx={{ ...theme.typography.subMenuCaption, mb: 0.5 }} display='block'>
                                            {renderPrimaryGroup().caption}
                                        </Typography>
                                    )}
                                </Typography>
                            )
                        }
                        sx={{ p: '10px', pb: 0.2, pt: 0, display: 'flex', flexDirection: 'column', gap: 0.3 }}
                    >
                        {renderPrimaryGroup().children.map((menu) => listItems(menu))}
                    </List>
                </Available>
            )}

            {renderNonPrimaryGroups().map((group) => {
                const groupPermissions = group.children.map((menu) => menu.permission).join(',')
                return (
                    <Available key={group.id} permission={groupPermissions}>
                        <Divider sx={{ height: '1px', borderColor: theme.palette.grey[900] + 25, mt: 0.5, mb: 0 }} />
                        <List
                            subheader={
                                group.title && (
                                    <Typography variant='caption' sx={{ ...theme.typography.menuCaption, mb: 0.5 }} display='block'>
                                        {group.title}
                                        {group.caption && (
                                            <Typography variant='caption' sx={{ ...theme.typography.subMenuCaption, mb: 0.5 }} display='block'>
                                                {group.caption}
                                            </Typography>
                                        )}
                                    </Typography>
                                )
                            }
                            sx={{ p: '10px', py: 0.2, display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0 }}
                        >
                            {group.children.map((menu) => listItems(menu))}
                        </List>
                    </Available>
                )
            })}
        </>
    )
}

NavGroup.propTypes = {
    item: PropTypes.object
}

export default NavGroup
