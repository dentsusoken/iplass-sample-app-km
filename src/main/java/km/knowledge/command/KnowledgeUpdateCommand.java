/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.command;

import java.util.Arrays;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import km.common.lifecycle.LifecycleHookService;
import km.common.util.CommandResponseUtil;
import km.inquiry.entity.Inquiry;
import km.knowledge.entity.Knowledge;
import km.knowledge.enums.Visibility;
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
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.spi.ServiceRegistry;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * ナレッジ記事を更新する。回答者のみが実行できる操作。
 *
 * <p>WebAPI: POST /api/km/knowledge/update/{oid}</p>
 * <p>Request body (JSON): { name, content, visibility, tagOids?, relatedInquiryOids? }</p>
 */
@WebApi(
		name = "km/knowledge/update",
		accepts = RequestType.REST_JSON,
		methods = MethodType.POST,
		responseResults = {@WebApiResultAttribute(name = "result")},
		paramMapping = @WebApiParamMapping(name = "oid", mapFrom = "${0}"),
		privileged = false,
		restJson = @RestJson(parameterName = "param"))
@CommandClass(name = "km/knowledge/KnowledgeUpdateCommand")
public class KnowledgeUpdateCommand implements Command {

	private static final Logger log = LoggerFactory.getLogger(KnowledgeUpdateCommand.class);

	@Override
	public String execute(RequestContext request) {
		// 回答者のみ許可するチェック
		if (!AuthHelper.isResponder()) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse(
							"FORBIDDEN_NOT_RESPONDER", "Only responders can update knowledge"));
			return "ERROR";
		}

		String oid = request.getParam("oid");
		EntityManager em = EntityDaoHelper.getEntityManager();

		// 排他ロック付きで読み込み
		Entity existing = em.loadAndLock(oid, Knowledge.DEFINITION_NAME);
		if (existing == null) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("KNOWLEDGE_NOT_FOUND", "Knowledge not found: " + oid));
			return "ERROR";
		}

		// パラメータ取得
		String name = request.getParam("name");
		String content = request.getParam("content");
		String visibility = request.getParam("visibility");

		// バリデーション
		if (name == null || name.trim().isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("VALIDATION_ERROR", "name is required"));
			return "ERROR";
		}
		if (content == null || content.trim().isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("VALIDATION_ERROR", "content is required"));
			return "ERROR";
		}
		try {
			Visibility.fromValue(visibility);
		} catch (IllegalArgumentException e) {
			log.debug("KnowledgeUpdate validation: invalid visibility={}", visibility, e);
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse("VALIDATION_ERROR", "Invalid visibility: " + visibility));
			return "ERROR";
		}

		// 更新エンティティの組み立て
		Entity update = new GenericEntity(Knowledge.DEFINITION_NAME);
		update.setOid(oid);
		update.setName(name.trim());
		update.setValue(Knowledge.CONTENT, content.trim());
		update.setValue(Knowledge.VISIBILITY, new SelectValue(visibility));

		// 参照の置換: タグ・関連問合せ（指定が空なら null を設定して全解除する）
		update.setValue(Knowledge.TAGS, buildRefs(request.getParams("tagOids"), Tag.DEFINITION_NAME));
		update.setValue(
				Knowledge.RELATED_INQUIRIES,
				buildRefs(request.getParams("relatedInquiryOids"), Inquiry.DEFINITION_NAME));

		// マージを確定するため、mergedTo を受け取って Knowledge の自己参照 Reference を更新する。
		// null や空文字を渡せばマージを解除できる (通常の運用では使わない)。
		String mergedToParam = request.getParam("mergedTo");
		String[] updateProperties;
		if (mergedToParam != null) {
			if (mergedToParam.isBlank()) {
				update.setValue(Knowledge.MERGED_TO, null);
			} else {
				Entity mergedTo = new GenericEntity(Knowledge.DEFINITION_NAME);
				mergedTo.setOid(mergedToParam.trim());
				update.setValue(Knowledge.MERGED_TO, mergedTo);
			}
			updateProperties = new String[] {
				"name",
				Knowledge.CONTENT,
				Knowledge.VISIBILITY,
				Knowledge.TAGS,
				Knowledge.RELATED_INQUIRIES,
				Knowledge.MERGED_TO,
			};
		} else {
			updateProperties = new String[] {
				"name", Knowledge.CONTENT, Knowledge.VISIBILITY, Knowledge.TAGS, Knowledge.RELATED_INQUIRIES,
			};
		}

		UpdateOption option = new UpdateOption(false);
		option.setUpdateProperties(updateProperties);
		em.update(update, option);

		// 主処理は完了済み。拡張が登録されていれば副次処理を呼ぶ (未登録ならスキップ)。
		ServiceRegistry registry = ServiceRegistry.getRegistry();
		if (registry.exists(LifecycleHookService.class)) {
			LifecycleHookService hook = registry.getService(LifecycleHookService.class);
			hook.afterKnowledgeSaved(em, oid);
		}

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(null));
		return "SUCCESS";
	}

	/**
	 * OID 配列から指定定義の参照 Entity 配列を生成する。指定が空のときは null（参照を全解除する）。
	 */
	private static Entity[] buildRefs(String[] oids, String definitionName) {
		if (oids == null || oids.length == 0) {
			return null;
		}
		return Arrays.stream(oids)
				.map(oid -> {
					GenericEntity ref = new GenericEntity(definitionName);
					ref.setOid(oid.trim());
					return ref;
				})
				.toArray(Entity[]::new);
	}
}
