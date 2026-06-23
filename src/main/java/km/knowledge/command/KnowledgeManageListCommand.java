/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.command;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandRequestUtil;
import km.common.util.CommandResponseUtil;
import km.knowledge.entity.Knowledge;
import km.knowledge.enums.Visibility;
import km.tag.entity.Tag;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SearchOption;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.query.Limit;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.entity.query.SortSpec;
import org.iplass.mtp.entity.query.SortSpec.SortType;
import org.iplass.mtp.entity.query.condition.Condition;
import org.iplass.mtp.entity.query.condition.expr.And;
import org.iplass.mtp.entity.query.condition.predicate.Equals;
import org.iplass.mtp.entity.query.condition.predicate.In;
import org.iplass.mtp.entity.query.condition.predicate.IsNotNull;
import org.iplass.mtp.entity.query.condition.predicate.IsNull;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * ナレッジ管理画面の一覧 (回答者専用)。
 *
 * <p>WebAPI: GET /api/km/knowledge/manage</p>
 *
 * <p>クエリパラメータ: {@code q} はキーワード (name + content の部分一致)、{@code tagOids} はカンマ区切りの
 * タグ OID (AND フィルタ)、{@code visibility} は {@code internal} / {@code public}、{@code includeMerged} は
 * マージ済ナレッジ ({@code mergedTo != null}) を含めるかどうか (既定 {@code false})、{@code offset} /
 * {@code limit} はページング (既定 0 / 20)。</p>
 *
 * <p>認可: 回答者ロールのみ。回答者以外は {@code FORBIDDEN_NOT_RESPONDER} を受け取る。</p>
 *
 * <p>この Command は {@code includeMerged} トグルを公開してナレッジ管理画面を支える。
 * このトグルは {@code /api/km/knowledge/search} には意図的に無い (利用者向け検索は常にマージ済ナレッジを隠す)。</p>
 */
@WebApi(
		name = "km/knowledge/manage",
		accepts = RequestType.REST_JSON,
		methods = MethodType.GET,
		responseResults = {@WebApiResultAttribute(name = "result")},
		privileged = false)
@CommandClass(name = "km/knowledge/KnowledgeManageListCommand")
public class KnowledgeManageListCommand implements Command {

	private static final int DEFAULT_LIMIT = 20;

	private static final Logger log = LoggerFactory.getLogger(KnowledgeManageListCommand.class);

	@Override
	public String execute(RequestContext request) {
		if (!AuthHelper.isResponder()) {
			CommandResponseUtil.setResult(
					request,
					CommandResponseUtil.errorResponse(
							"FORBIDDEN_NOT_RESPONDER", "Only responders can access the knowledge management list"));
			return "ERROR";
		}

		String q = request.getParam("q");
		// tagOids は配列パラメータで、同名キーを複数 (?tagOids=a&tagOids=b) で送るため、
		// getParams (servlet の getParameterValues 相当) で受け取る。
		String[] tagOidsParam = request.getParams("tagOids");
		String visibilityParam = request.getParam("visibility");
		boolean includeMerged = "true".equalsIgnoreCase(request.getParam("includeMerged"));
		int offset = CommandRequestUtil.getIntParam(request, "offset", 0);
		int limit = CommandRequestUtil.getIntParam(request, "limit", DEFAULT_LIMIT);

		List<Condition> conditions = new ArrayList<>();

		// キーワード一致は全文検索 API 側で評価するため、ここでは構造化フィルタ (tag/visibility/merged) のみを積む。

		addTagConditions(conditions, tagOidsParam);

		if (visibilityParam != null && !visibilityParam.trim().isEmpty()) {
			try {
				Visibility v = Visibility.fromValue(visibilityParam.trim());
				conditions.add(new Equals(Knowledge.VISIBILITY, v.getValue()));
			} catch (IllegalArgumentException e) {
				log.debug("KnowledgeManageList validation: invalid visibility={}", visibilityParam, e);
				CommandResponseUtil.setResult(
						request,
						CommandResponseUtil.errorResponse(
								"VALIDATION_ERROR", "visibility must be 'internal' or 'public'"));
				return "ERROR";
			}
		}

		if (!includeMerged) {
			// iPLAss EQL は Reference 型プロパティ自体に IsNull を直接適用できない (QueryException)。
			// "mergedTo.oid IS NULL" 相当として oid プロパティ式に対して IsNull を組み立てる。
			conditions.add(new IsNull(Knowledge.MERGED_TO + ".oid"));
		}

		Condition where = conditions.isEmpty()
				? null
				: (conditions.size() == 1 ? conditions.get(0) : new And(conditions.toArray(new Condition[0])));

		EntityManager em = EntityDaoHelper.getEntityManager();

		Query baseQuery = new Query()
				.select(
						Knowledge.OID,
						Knowledge.NAME,
						Knowledge.VISIBILITY,
						Knowledge.UPDATE_DATE,
						Knowledge.MERGED_TO + ".oid")
				.from(Knowledge.DEFINITION_NAME);
		if (where != null) {
			baseQuery.where(where);
		}
		baseQuery.order(new SortSpec(Knowledge.UPDATE_DATE, SortType.DESC));
		baseQuery.setLimit(new Limit(limit, offset));

		SearchResult<Entity> result;
		int totalCount;
		if (q != null && !q.trim().isEmpty()) {
			// 全文検索: name/content 横断のキーワード一致を構造化条件 (tag/visibility/merged) と組み合わせる。
			// 総件数は countTotal で取得するため別 count クエリは不要。Query には Entity.OID を select 済み。
			SearchOption option = new SearchOption();
			option.setCountTotal(true);
			result = em.fulltextSearchEntity(baseQuery, q.trim(), option);
			totalCount = result.getTotalCount();
		} else {
			result = em.searchEntity(baseQuery);
			// 件数取得は em.count を使う (フルメモリ展開を避けるため。InquiryListCommand と同じ方式)
			Query countQuery = new Query().select(Knowledge.OID).from(Knowledge.DEFINITION_NAME);
			if (where != null) {
				countQuery.where(where);
			}
			totalCount = em.count(countQuery);
		}

		List<Map<String, Object>> dataList = new ArrayList<>();
		if (result != null && result.getList() != null) {
			// タグは batch で 1 query にまとめる (N+1 回避)
			List<String> oids = new ArrayList<>();
			for (Entity e : result.getList()) {
				oids.add(e.getOid());
			}
			Map<String, List<Map<String, String>>> tagsByOid = loadTagsBatch(em, oids);

			for (Entity entity : result.getList()) {
				dataList.add(toItem(entity, tagsByOid));
			}
		}

		CommandResponseUtil.setResult(
				request, CommandResponseUtil.successListResponse(dataList, totalCount, offset, limit));
		return "SUCCESS";
	}

	/**
	 * 指定された Knowledge OID 群のタグを 1 クエリでまとめて取得する。
	 *
	 * <p>{@link EntityDaoHelper#loadTagsOf} を 1 件ずつ呼ぶ素直な実装だと N+1 になるため、
	 * Knowledge.oid IN (...) で一括取得し OID 別にグループ化する。</p>
	 */
	private Map<String, List<Map<String, String>>> loadTagsBatch(EntityManager em, List<String> oids) {
		if (oids.isEmpty()) {
			return Map.of();
		}
		Query q = new Query()
				.select(Knowledge.OID, Knowledge.TAGS + "." + Tag.OID, Knowledge.TAGS + "." + Tag.TAG_NAME)
				.from(Knowledge.DEFINITION_NAME)
				.where(new And(new In(Knowledge.OID, oids.toArray()), new IsNotNull(Knowledge.TAGS + "." + Tag.OID)));
		SearchResult<Entity> res = em.searchEntity(q);
		Map<String, List<Map<String, String>>> result = new LinkedHashMap<>();
		if (res != null && res.getList() != null) {
			for (Entity row : res.getList()) {
				String knowledgeOid = row.getValue(Knowledge.OID);
				Map<String, String> tag = new LinkedHashMap<>();
				tag.put("oid", row.getValue(Knowledge.TAGS + "." + Tag.OID));
				tag.put("tagName", row.getValue(Knowledge.TAGS + "." + Tag.TAG_NAME));
				result.computeIfAbsent(knowledgeOid, k -> new ArrayList<>()).add(tag);
			}
		}
		return result;
	}

	private static void addTagConditions(List<Condition> conditions, String[] tagOidsParam) {
		if (tagOidsParam == null || tagOidsParam.length == 0) {
			return;
		}
		String[] tagOids = Arrays.stream(tagOidsParam)
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.toArray(String[]::new);
		if (tagOids.length > 0) {
			conditions.add(new In(Knowledge.TAGS + ".oid", (Object[]) tagOids));
		}
	}

	private static Map<String, Object> toItem(Entity entity, Map<String, List<Map<String, String>>> tagsByOid) {
		Map<String, Object> item = new LinkedHashMap<>();
		item.put("oid", entity.getOid());
		item.put("name", entity.getName());
		SelectValue sv = entity.getValue(Knowledge.VISIBILITY);
		item.put("visibility", sv == null ? null : sv.getValue());
		item.put("tags", tagsByOid.getOrDefault(entity.getOid(), List.of()));
		item.put("updateDate", entity.getValue(Knowledge.UPDATE_DATE));
		Object oidValue = entity.getValue(Knowledge.MERGED_TO + ".oid");
		if (oidValue != null) {
			Map<String, Object> mergedToMap = new LinkedHashMap<>();
			mergedToMap.put("oid", oidValue.toString());
			item.put("mergedTo", mergedToMap);
		} else {
			item.put("mergedTo", null);
		}
		return item;
	}
}
