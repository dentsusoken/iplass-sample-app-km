/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.command;

import km.common.auth.AuthHelper;
import org.iplass.mtp.auth.User;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.action.ActionMapping;
import org.iplass.mtp.command.annotation.action.Result;
import org.iplass.mtp.command.annotation.action.Result.Type;
import org.iplass.mtp.command.annotation.template.Template;
import org.iplass.mtp.util.StringUtil;

/**
 * 認証済みユーザーの情報とロールを、JSP テンプレート用のリクエスト属性に設定する。
 *
 * <p>Action: km/index → Template(index.jsp)</p>
 */
@Template(
		name = "km/index",
		displayName = "ナレッジ管理トップ",
		path = "/jsp/km/index.jsp",
		contentType = "text/html; charset=utf-8")
@ActionMapping(name = "km/index", result = @Result(status = "*", type = Type.TEMPLATE, value = "km/index"))
@CommandClass(name = "km/auth/AuthSessionCommand")
public class AuthSessionCommand implements Command {

	@Override
	public String execute(RequestContext request) {
		User user = AuthHelper.getCurrentUser();

		request.setAttribute("userOid", user.getOid());
		request.setAttribute("userName", StringUtil.escapeJavaScript(user.getName()));
		request.setAttribute("roleName", AuthHelper.currentUserRole());

		return "SUCCESS";
	}
}
