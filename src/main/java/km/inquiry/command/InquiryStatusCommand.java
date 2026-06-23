/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import java.sql.Timestamp;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandResponseUtil;
import km.inquiry.entity.Inquiry;
import km.inquiry.enums.InquiryStatus;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.RestJson;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiParamMapping;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.command.annotation.webapi.WebApis;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * 問合せのクローズ・再オープン操作を扱う。
 * close と reopen の 2 つの WebAPI 定義がこの 1 つの Command を共有する。
 * 操作の種類は WebAPI 名から判定する。
 *
 * <p>WebAPI (close): POST /api/km/inquiry/close/{oid}</p>
 * <p>WebAPI (reopen): POST /api/km/inquiry/reopen/{oid}</p>
 */
@WebApis({
	@WebApi(
			name = "km/inquiry/close",
			accepts = RequestType.REST_JSON,
			methods = MethodType.POST,
			responseResults = {@WebApiResultAttribute(name = "result")},
			paramMapping = @WebApiParamMapping(name = "oid", mapFrom = "${0}"),
			privileged = false,
			restJson = @RestJson(parameterName = "param")),
	@WebApi(
			name = "km/inquiry/reopen",
			accepts = RequestType.REST_JSON,
			methods = MethodType.POST,
			responseResults = {@WebApiResultAttribute(name = "result")},
			paramMapping = @WebApiParamMapping(name = "oid", mapFrom = "${0}"),
			privileged = false)
})
@CommandClass(name = "km/inquiry/InquiryStatusCommand")
public class InquiryStatusCommand implements Command {

	private static final String OPERATION_CLOSE = "close";
	private static final String OPERATION_REOPEN = "reopen";

	@Override
	public String execute(RequestContext request) {
		String oid = request.getParam("oid");

		// WebAPI 名から操作を判定する
		String webApiName = (String) request.getAttribute("webApiName");
		String operation = resolveOperation(webApiName);

		EntityManager em = EntityDaoHelper.getEntityManager();

		// 問合せを排他ロック付きで読み込む
		Entity inquiry = em.loadAndLock(oid, Inquiry.DEFINITION_NAME);
		if (inquiry == null) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("INQUIRY_NOT_FOUND", "Inquiry not found: " + oid));
			return "ERROR";
		}

		// loadAndLock は Select プロパティを SelectValue として返す
		SelectValue statusValue = inquiry.getValue(Inquiry.STATUS);
		InquiryStatus status = InquiryStatus.valueOf(statusValue.getValue());

		if (OPERATION_CLOSE.equals(operation)) {
			return executeClose(request, oid, status, em);
		} else {
			return executeReopen(request, oid, status, em);
		}
	}

	private String executeClose(RequestContext request, String oid, InquiryStatus status, EntityManager em) {
		// 検証: クローズできるのは Open または Answered のみ
		if (status != InquiryStatus.Open && status != InquiryStatus.Answered) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse(
							"INVALID_STATUS_TRANSITION", "Cannot close inquiry with status: " + status.name()));
			return "ERROR";
		}

		// JSON ボディから resolution を取得する (param.resolution)
		String resolution = request.getParam("resolution");
		if (resolution == null || resolution.isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("VALIDATION_ERROR", "resolution is required"));
			return "ERROR";
		}

		String newStatus;
		if ("resolved".equals(resolution)) {
			newStatus = InquiryStatus.Resolved.name();
		} else if ("canceled".equals(resolution)) {
			newStatus = InquiryStatus.Canceled.name();
		} else {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse(
							"VALIDATION_ERROR", "resolution must be 'resolved' or 'canceled'"));
			return "ERROR";
		}

		Entity update = new GenericEntity(Inquiry.DEFINITION_NAME);
		update.setOid(oid);
		update.setValue(Inquiry.STATUS, new SelectValue(newStatus));
		update.setValue(Inquiry.CLOSED_DATE, new Timestamp(System.currentTimeMillis()));

		UpdateOption option = new UpdateOption(false);
		option.setUpdateProperties(Inquiry.STATUS, Inquiry.CLOSED_DATE);
		em.update(update, option);

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(null));
		return "SUCCESS";
	}

	private String executeReopen(RequestContext request, String oid, InquiryStatus status, EntityManager em) {
		// 検証: 再オープンできるのは Resolved または Canceled のみ
		if (status != InquiryStatus.Resolved && status != InquiryStatus.Canceled) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse(
							"INVALID_STATUS_TRANSITION", "Cannot reopen inquiry with status: " + status.name()));
			return "ERROR";
		}

		Entity update = new GenericEntity(Inquiry.DEFINITION_NAME);
		update.setOid(oid);
		update.setValue(Inquiry.STATUS, new SelectValue(InquiryStatus.Open.name()));
		update.setValue(Inquiry.CLOSED_DATE, null);

		UpdateOption option = new UpdateOption(false);
		option.setUpdateProperties(Inquiry.STATUS, Inquiry.CLOSED_DATE);
		em.update(update, option);

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(null));
		return "SUCCESS";
	}

	/**
	 * WebAPI 名から操作の種類を解決する。
	 */
	private String resolveOperation(String webApiName) {
		if (webApiName != null && webApiName.contains("reopen")) {
			return OPERATION_REOPEN;
		}
		return OPERATION_CLOSE;
	}
}
