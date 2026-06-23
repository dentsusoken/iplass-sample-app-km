/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import java.util.ArrayList;
import java.util.List;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandResponseUtil;
import km.inquiry.entity.Inquiry;
import km.tag.entity.Tag;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.RestJson;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiParamMapping;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * 問合せのタグを更新する。回答者のみが実行できる操作。
 * タグは渡されたタグ OID のリストで全置換する。
 *
 * <p>WebAPI: PUT /api/km/inquiry/tags/update/{oid}</p>
 * <p>Request body: { "tagOids": ["tag001", "tag003"] }</p>
 */
@WebApi(
		name = "km/inquiry/tags/update",
		accepts = RequestType.REST_JSON,
		methods = MethodType.PUT,
		responseResults = {@WebApiResultAttribute(name = "result")},
		paramMapping = @WebApiParamMapping(name = "oid", mapFrom = "${0}"),
		privileged = false,
		restJson = @RestJson(parameterName = "param"))
@CommandClass(name = "km/inquiry/InquiryTagUpdateCommand")
public class InquiryTagUpdateCommand implements Command {

	@Override
	public String execute(RequestContext request) {
		// 回答者のみ許可するチェック
		if (!AuthHelper.isResponder()) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse("FORBIDDEN_NOT_RESPONDER", "Only responders can edit tags"));
			return "ERROR";
		}

		String oid = request.getParam("oid");

		EntityManager em = EntityDaoHelper.getEntityManager();

		// 問合せを排他ロック付きで読み込む
		Entity inquiry = em.loadAndLock(oid, Inquiry.DEFINITION_NAME);
		if (inquiry == null) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("INQUIRY_NOT_FOUND", "Inquiry not found: " + oid));
			return "ERROR";
		}

		// JSON ボディから tagOids を取得する。
		// @RestJson(parameterName = "param") を指定すると、配列値は
		// request.getParams("tagOids") で JSON ボディから受け取れる。
		String[] tagOids = request.getParams("tagOids");

		// タグの参照エンティティを組み立てる (null・空の OID は除外)
		Entity[] tagRefs = null;
		if (tagOids != null && tagOids.length > 0) {
			List<Entity> tagRefList = new ArrayList<>();
			for (String tagOid : tagOids) {
				if (tagOid != null && !tagOid.isEmpty()) {
					Entity tagRef = new GenericEntity(Tag.DEFINITION_NAME);
					tagRef.setOid(tagOid);
					tagRefList.add(tagRef);
				}
			}
			if (!tagRefList.isEmpty()) {
				tagRefs = tagRefList.toArray(new Entity[0]);
			}
		}

		Entity update = new GenericEntity(Inquiry.DEFINITION_NAME);
		update.setOid(oid);
		update.setValue(Inquiry.TAGS, tagRefs);

		UpdateOption option = new UpdateOption(false);
		option.setUpdateProperties(Inquiry.TAGS);
		em.update(update, option);

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(null));
		return "SUCCESS";
	}
}
