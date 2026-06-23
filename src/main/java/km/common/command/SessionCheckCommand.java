/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.command;

import km.common.util.CommandResponseUtil;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * セッションの有効性を確認する軽量なエンドポイント。
 *
 * <p>WebAPI: GET /api/km/session/check</p>
 *
 * <p>セッションが有効なら iPLAss はリクエストを通し、この Command は SUCCESS を返す。
 * セッションが切れている場合、iPLAss はこの Command の実行前に 403 でリクエストを拒否する。</p>
 */
@WebApi(
		name = "km/session/check",
		accepts = RequestType.REST_JSON,
		methods = MethodType.GET,
		responseResults = {@WebApiResultAttribute(name = "result")},
		privileged = false)
@CommandClass(name = "km/session/SessionCheckCommand")
public class SessionCheckCommand implements Command {

	@Override
	public String execute(RequestContext request) {
		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(null));
		return "SUCCESS";
	}
}
