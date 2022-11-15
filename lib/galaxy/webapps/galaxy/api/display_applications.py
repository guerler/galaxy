"""
API operations on annotations.
"""
import logging

from galaxy.managers.display_applications import DisplayApplicationsManager
from galaxy.web import (
    expose_api,
    require_admin,
)
from . import (
    BaseGalaxyAPIController,
    depends,
)

log = logging.getLogger(__name__)


class DisplayApplicationsController(BaseGalaxyAPIController):
    manager = depends(DisplayApplicationsManager)

    @expose_api
    def index(self, trans, **kwd):
        """
        GET /api/display_applications/

        Returns the list of display applications.

        :returns:   list of available display applications
        :rtype:     list
        """
        return self.manager.index()

    @expose_api
    @require_admin
    def reload(self, trans, payload=None, **kwd):
        """
        POST /api/display_applications/reload

        Reloads the list of display applications.

        :param  ids:  list containing ids of display to be reloaded
        :type   ids:  list
        """
        payload = payload or {}
        ids = payload.get("ids", [])
        return self.manager.reload(ids)

    @expose_api
    def create_link(self,
        trans,
        dataset_id=None,
        user_id=None,
        app_name=None,
        link_name=None,
        app_action=None,
        action_param=None,
        action_param_extra=None,
        **kwd):
        """
        POST /api/display_applications/create_link

        Reloads the list of display applications.

        :param  ids:  list containing ids of display to be reloaded
        :type   ids:  list
        """
        return dict(
            link="YOUR NEW LINK",
            user_id=user_id,
            dataset_id=dataset_id,
            action_param=action_param,
            action_param_extra=action_param_extra,
            app_action=app_action,
            link_name=link_name,
            app_name=app_name,
        )
