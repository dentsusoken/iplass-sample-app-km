/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.command;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandRequestUtil;
import km.common.util.CommandResponseUtil;
import km.knowledge.entity.Knowledge;
import km.knowledge.enums.Visibility;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SearchOption;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.entity.query.condition.Condition;
import org.iplass.mtp.entity.query.condition.expr.And;
import org.iplass.mtp.entity.query.condition.predicate.Equals;
import org.iplass.mtp.entity.query.condition.predicate.IsNull;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * キーワードでナレッジ記事を検索し、公開範囲でフィルタする。
 * 利用者ロールは public のナレッジのみ、回答者はすべてを見られる。
 *
 * <p>WebAPI: GET /api/km/knowledge/search</p>
 */
@WebApi(
		name = "km/knowledge/search",
		accepts = RequestType.REST_JSON,
		methods = MethodType.GET,
		responseResults = {@WebApiResultAttribute(name = "result")},
		privileged = false)
@CommandClass(name = "km/knowledge/KnowledgeSearchCommand")
public class KnowledgeSearchCommand implements Command {

	private static final int DEFAULT_LIMIT = 10;

	@Override
	public String execute(RequestContext request) {
		String q = request.getParam("q");
		int limit = CommandRequestUtil.getIntParam(request, "limit", DEFAULT_LIMIT);

		// バリデーション
		if (q == null || q.trim().isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("VALIDATION_ERROR", "q is required"));
			return "ERROR";
		}

		// WHERE 条件を組み立てる。キーワード一致は全文検索 API 側で評価するため、
		// ここでは構造化フィルタ (公開範囲・マージ除外) のみを Query に積む。
		List<Condition> conditions = new ArrayList<>();

		// 公開範囲フィルタ: 利用者ロールは public のナレッジのみ見られる
		if (!AuthHelper.isResponder()) {
			conditions.add(new Equals(Knowledge.VISIBILITY, Visibility.pub.getValue()));
		}

		// マージ済 (統合先に置き換わったナレッジ) は検索結果から除外。
		// iPLAss EQL は Reference 型プロパティ自体に IsNull を直接適用できないため、oid プロパティ式を指定する。
		conditions.add(new IsNull(Knowledge.MERGED_TO + ".oid"));

		Condition where;
		if (conditions.size() == 1) {
			where = conditions.get(0);
		} else {
			where = new And(conditions.toArray(new Condition[0]));
		}

		EntityManager em = EntityDaoHelper.getEntityManager();

		Query query = new Query()
				.select(
						Knowledge.OID,
						Knowledge.NAME,
						Knowledge.CONTENT,
						Knowledge.TAGS + ".oid",
						Knowledge.TAGS + ".name",
						Knowledge.VISIBILITY)
				.from(Knowledge.DEFINITION_NAME)
				.where(where);
		query.limit(limit);

		// 全文検索: name / content を横断したキーワード一致を Query の構造化条件と組み合わせる。
		// Query には Entity.OID を select に含める必要がある (含めないと空リストが返る)。
		SearchResult<Entity> searchResult = em.fulltextSearchEntity(query, q.trim(), new SearchOption());

		List<Map<String, Object>> dataList = new ArrayList<>();
		if (searchResult != null && searchResult.getList() != null) {
			for (Entity entity : searchResult.getList()) {
				Map<String, Object> item = new HashMap<>();
				item.put("oid", entity.getOid());
				item.put("name", entity.getName());
				item.put("content", entity.getValue(Knowledge.CONTENT));
				item.put("tags", EntityDaoHelper.toTagList(entity.getValue(Knowledge.TAGS)));
				item.put("visibility", entity.getValue(Knowledge.VISIBILITY));
				dataList.add(item);
			}
		}

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(dataList));
		return "SUCCESS";
	}
}
