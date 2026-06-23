/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.command;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
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
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.spi.ServiceRegistry;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 新しいナレッジ記事を作成する。
 *
 * <p>WebAPI: POST /api/km/knowledge/create</p>
 * <p>Accepts: REST_JSON (name, content, visibility, tagOids[], relatedInquiryOids[])</p>
 * <p>回答者のみが実行できる操作。</p>
 */
@WebApi(
		name = "km/knowledge/create",
		accepts = RequestType.REST_JSON,
		methods = MethodType.POST,
		responseResults = {@WebApiResultAttribute(name = "result")},
		privileged = false,
		restJson = @RestJson(parameterName = "param"))
@CommandClass(name = "km/knowledge/KnowledgeCreateCommand")
public class KnowledgeCreateCommand implements Command {

	private static final Logger log = LoggerFactory.getLogger(KnowledgeCreateCommand.class);

	@Override
	public String execute(RequestContext request) {
		// 回答者のみ許可するチェック
		if (!AuthHelper.isResponder()) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse(
							"FORBIDDEN_NOT_RESPONDER", "Only responders can create knowledge"));
			return "ERROR";
		}

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

		Visibility vis;
		try {
			vis = Visibility.fromValue(visibility);
		} catch (IllegalArgumentException e) {
			log.debug("KnowledgeCreate validation: invalid visibility={}", visibility, e);
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse("VALIDATION_ERROR", "visibility must be 'internal' or 'public'"));
			return "ERROR";
		}

		// エンティティの組み立て
		Entity entity = new GenericEntity(Knowledge.DEFINITION_NAME);
		entity.setName(name.trim());
		entity.setValue(Knowledge.CONTENT, content.trim());
		entity.setValue(Knowledge.VISIBILITY, new SelectValue(vis.getValue()));

		// 任意: タグ参照
		String[] tagOids = request.getParams("tagOids");
		if (tagOids != null && tagOids.length > 0) {
			Entity[] tagRefs = Arrays.stream(tagOids)
					.filter(oid -> oid != null && !oid.isEmpty())
					.map(oid -> {
						Entity tagRef = new GenericEntity(Tag.DEFINITION_NAME);
						tagRef.setOid(oid);
						return tagRef;
					})
					.toArray(Entity[]::new);
			if (tagRefs.length > 0) {
				entity.setValue(Knowledge.TAGS, tagRefs);
			}
		}

		// 任意: 関連問合せ参照
		String[] relatedInquiryOids = request.getParams("relatedInquiryOids");
		if (relatedInquiryOids != null && relatedInquiryOids.length > 0) {
			Entity[] inquiryRefs = Arrays.stream(relatedInquiryOids)
					.filter(oid -> oid != null && !oid.isEmpty())
					.map(oid -> {
						Entity ref = new GenericEntity(Inquiry.DEFINITION_NAME);
						ref.setOid(oid);
						return ref;
					})
					.toArray(Entity[]::new);
			if (inquiryRefs.length > 0) {
				entity.setValue(Knowledge.RELATED_INQUIRIES, inquiryRefs);
			}
		}

		// 登録
		EntityManager em = EntityDaoHelper.getEntityManager();
		String oid = em.insert(entity);

		// 主処理は完了済み。拡張が登録されていれば副次処理を呼ぶ (未登録ならスキップ)。
		ServiceRegistry registry = ServiceRegistry.getRegistry();
		if (registry.exists(LifecycleHookService.class)) {
			LifecycleHookService hook = registry.getService(LifecycleHookService.class);
			hook.afterKnowledgeSaved(em, oid);
		}

		// レスポンス生成
		Map<String, Object> data = new HashMap<>();
		data.put("oid", oid);
		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(data));

		return "SUCCESS";
	}
}
