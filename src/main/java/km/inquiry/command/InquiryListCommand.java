/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandRequestUtil;
import km.common.util.CommandResponseUtil;
import km.inquiry.entity.Inquiry;
import km.inquiry.entity.Post;
import km.tag.entity.Tag;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.entity.query.SortSpec;
import org.iplass.mtp.entity.query.SortSpec.SortType;
import org.iplass.mtp.entity.query.SubQuery;
import org.iplass.mtp.entity.query.condition.Condition;
import org.iplass.mtp.entity.query.condition.expr.And;
import org.iplass.mtp.entity.query.condition.expr.Or;
import org.iplass.mtp.entity.query.condition.predicate.Equals;
import org.iplass.mtp.entity.query.condition.predicate.GreaterEqual;
import org.iplass.mtp.entity.query.condition.predicate.In;
import org.iplass.mtp.entity.query.condition.predicate.Lesser;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * 検索フィルタ (任意) 付きで問合せのページングリストを返す。
 * 利用者ロールのユーザーは、自分の所属グループの問合せだけを見られる。
 *
 * <p>WebAPI: GET /api/km/inquiry/list</p>
 */
@WebApi(
		name = "km/inquiry/list",
		accepts = RequestType.REST_JSON,
		methods = MethodType.GET,
		responseResults = {@WebApiResultAttribute(name = "result")},
		privileged = false)
@CommandClass(name = "km/inquiry/InquiryListCommand")
public class InquiryListCommand implements Command {

	private static final int DEFAULT_LIMIT = 20;
	private static final int DEFAULT_OFFSET = 0;

	/** ソート可能なフィールドのホワイトリスト */
	private static final Map<String, String> SORT_FIELD_MAP = Map.of(
			"createDate", Inquiry.CREATE_DATE,
			"name", Inquiry.NAME,
			"status", Inquiry.STATUS);

	@Override
	public String execute(RequestContext request) {
		// 配列パラメータ (statuses / tagOids) は同名キーを複数 (?statuses=a&statuses=b) で送るため、
		// getParams (servlet の getParameterValues 相当) で String[] として受け取る。
		String[] statuses = request.getParams("statuses");
		String[] tagOids = request.getParams("tagOids");
		String keyword = request.getParam("keyword");
		String createDateFrom = request.getParam("createDateFrom");
		String createDateTo = request.getParam("createDateTo");
		String sortField = CommandRequestUtil.getParam(request, "sortField", "createDate");
		String sortOrder = CommandRequestUtil.getParam(request, "sortOrder", "DESC");
		int offset = CommandRequestUtil.getIntParam(request, "offset", DEFAULT_OFFSET);
		int limit = CommandRequestUtil.getIntParam(request, "limit", DEFAULT_LIMIT);

		EntityManager em = EntityDaoHelper.getEntityManager();

		// WHERE 条件を組み立てる
		List<Condition> conditions = new ArrayList<>();

		addStatusConditions(conditions, statuses);
		addTagConditions(conditions, tagOids);

		// キーワードフィルタ: 全文検索で問合せ自身 (name/summary) と投稿文 (Post.content) を横断検索し、
		// ヒットした問合せ OID 集合で絞り込む。
		if (keyword != null && !keyword.trim().isEmpty()) {
			Set<String> candidateOids = resolveInquiryOidsByKeyword(em, keyword.trim());
			if (candidateOids.isEmpty()) {
				// ヒット無し: 一覧クエリを実行せずに空結果を返す
				CommandResponseUtil.setResult(
						request, CommandResponseUtil.successListResponse(new ArrayList<>(), 0, offset, limit));
				return "SUCCESS";
			}
			conditions.add(new In(Inquiry.OID, candidateOids.toArray()));
		}

		// createDate の範囲フィルタ
		if (createDateFrom != null && !createDateFrom.isEmpty()) {
			conditions.add(new GreaterEqual(Inquiry.CREATE_DATE, createDateFrom));
		}
		if (createDateTo != null && !createDateTo.isEmpty()) {
			// createDateTo は当日を含めるため、翌日 0:00 未満 ('<') で比較する。
			LocalDate parsedTo;
			try {
				parsedTo = LocalDate.parse(createDateTo);
			} catch (DateTimeParseException e) {
				CommandResponseUtil.setResult(
						request,
						CommandResponseUtil.errorResponse(
								"VALIDATION_ERROR", "createDateTo is not a valid date (yyyy-MM-dd): " + createDateTo));
				return "ERROR";
			}
			conditions.add(new Lesser(Inquiry.CREATE_DATE, parsedTo.plusDays(1).toString()));
		}

		// 条件を結合する
		Condition where = combine(conditions);

		// ソートフィールドはホワイトリスト経由で選択するため、EQL インジェクションは発生しない。
		String eqlSortField = SORT_FIELD_MAP.getOrDefault(sortField, Inquiry.CREATE_DATE);
		SortType eqlSortType = "ASC".equalsIgnoreCase(sortOrder) ? SortType.ASC : SortType.DESC;

		// totalCount 用のカウントクエリ
		Query countQuery = new Query().select(Inquiry.OID).from(Inquiry.DEFINITION_NAME);
		if (where != null) {
			countQuery.where(where);
		}
		int totalCount = em.count(countQuery);

		// ページング付きのデータクエリ
		Query dataQuery = new Query()
				.select(
						Inquiry.OID,
						Inquiry.NAME,
						Inquiry.SUMMARY_SHORT,
						Inquiry.STATUS,
						Inquiry.TAGS + "." + Tag.OID,
						Inquiry.TAGS + "." + Tag.TAG_NAME,
						Inquiry.CLOSED_DATE,
						Inquiry.CREATE_BY,
						Inquiry.CREATE_DATE)
				.from(Inquiry.DEFINITION_NAME)
				.order(new SortSpec(eqlSortField, eqlSortType));
		if (where != null) {
			dataQuery.where(where);
		}
		dataQuery.getSelect().setDistinct(true);
		dataQuery.limit(limit, offset);

		SearchResult<Entity> searchResult = em.searchEntity(dataQuery);

		List<Map<String, Object>> dataList = new ArrayList<>();
		if (searchResult != null && searchResult.getList() != null) {
			for (Entity entity : searchResult.getList()) {
				dataList.add(toItem(entity));
			}
		}

		CommandResponseUtil.setResult(
				request, CommandResponseUtil.successListResponse(dataList, totalCount, offset, limit));
		return "SUCCESS";
	}

	/**
	 * キーワードで Inquiry と Post を横断全文検索し、ヒットした問合せ OID 集合を返す。
	 * 投稿文 (Post) のヒットは親問合せ (posts.oid 経由) に逆引きして含める。
	 */
	private Set<String> resolveInquiryOidsByKeyword(EntityManager em, String keyword) {
		Map<String, List<String>> hits =
				em.fulltextSearchOidList(List.of(Inquiry.DEFINITION_NAME, Post.DEFINITION_NAME), keyword);
		if (hits == null) {
			return new LinkedHashSet<>();
		}

		Set<String> inquiryOids = new LinkedHashSet<>(hits.getOrDefault(Inquiry.DEFINITION_NAME, List.of()));

		List<String> postOids = hits.getOrDefault(Post.DEFINITION_NAME, List.of());
		if (postOids != null && !postOids.isEmpty()) {
			// 投稿文ヒットを親問合せに逆引き (posts は COMPOSITION 参照)
			Query parentQuery = new Query()
					.select(Inquiry.OID)
					.from(Inquiry.DEFINITION_NAME)
					.where(new In(Inquiry.POSTS + ".oid", postOids.toArray()));
			SearchResult<Entity> parents = em.searchEntity(parentQuery);
			if (parents != null && parents.getList() != null) {
				for (Entity parent : parents.getList()) {
					inquiryOids.add(parent.getOid());
				}
			}
		}
		return inquiryOids;
	}

	private static void addStatusConditions(List<Condition> conditions, String[] statuses) {
		if (statuses == null || statuses.length == 0) {
			return;
		}
		if (statuses.length == 1) {
			conditions.add(new Equals(Inquiry.STATUS, statuses[0].trim()));
			return;
		}
		Condition[] statusConditions = new Condition[statuses.length];
		for (int i = 0; i < statuses.length; i++) {
			statusConditions[i] = new Equals(Inquiry.STATUS, statuses[i].trim());
		}
		conditions.add(new Or(statusConditions));
	}

	private static void addTagConditions(List<Condition> conditions, String[] tagOids) {
		if (tagOids == null || tagOids.length == 0) {
			return;
		}
		for (String tagOid : tagOids) {
			String trimmed = tagOid.trim();
			if (!trimmed.isEmpty()) {
				Query tagSubQuery = new Query()
						.select(Inquiry.OID)
						.from(Inquiry.DEFINITION_NAME)
						.where(new Equals(Inquiry.TAGS + ".oid", trimmed));
				conditions.add(new In(Inquiry.OID, new SubQuery(tagSubQuery)));
			}
		}
	}

	private static Condition combine(List<Condition> conditions) {
		if (conditions.isEmpty()) {
			return null;
		}
		if (conditions.size() == 1) {
			return conditions.get(0);
		}
		return new And(conditions.toArray(new Condition[0]));
	}

	private static Map<String, Object> toItem(Entity entity) {
		Map<String, Object> item = new HashMap<>();
		item.put("oid", entity.getOid());
		item.put("name", entity.getName());
		item.put("summaryShort", entity.getValue(Inquiry.SUMMARY_SHORT));
		SelectValue statusVal = entity.getValue(Inquiry.STATUS);
		item.put("status", statusVal != null ? statusVal.getValue() : null);
		item.put("tags", EntityDaoHelper.toTagList(entity.getValue(Inquiry.TAGS)));
		item.put("closedDate", entity.getValue(Inquiry.CLOSED_DATE));
		String createByOid = entity.getValue(Inquiry.CREATE_BY);
		item.put("createBy", EntityDaoHelper.toUserRef(EntityDaoHelper.loadUser(createByOid)));
		item.put("createDate", entity.getValue(Inquiry.CREATE_DATE));
		return item;
	}
}
