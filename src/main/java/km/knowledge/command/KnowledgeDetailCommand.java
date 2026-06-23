/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.knowledge.command;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandResponseUtil;
import km.inquiry.entity.Inquiry;
import km.knowledge.entity.Knowledge;
import km.knowledge.enums.Visibility;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiParamMapping;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.entity.query.condition.Condition;
import org.iplass.mtp.entity.query.condition.expr.And;
import org.iplass.mtp.entity.query.condition.predicate.Equals;
import org.iplass.mtp.entity.query.condition.predicate.IsNotNull;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * タグと関連問合せを含むナレッジ詳細を返す。
 *
 * <p>WebAPI: GET /api/km/knowledge/detail/{oid}</p>
 *
 * <p>パスパラメータ {oid} は WebAPI の parameterMapping で ${0} として渡る。</p>
 */
@WebApi(
		name = "km/knowledge/detail",
		accepts = RequestType.REST_JSON,
		methods = MethodType.GET,
		responseResults = {@WebApiResultAttribute(name = "result")},
		paramMapping = @WebApiParamMapping(name = "oid", mapFrom = "${0}"),
		privileged = false)
@CommandClass(name = "km/knowledge/KnowledgeDetailCommand")
public class KnowledgeDetailCommand implements Command {

	@Override
	public String execute(RequestContext request) {
		String oid = request.getParam("oid");

		EntityManager em = EntityDaoHelper.getEntityManager();

		// WHERE 条件を組み立てる: oid 一致 + 回答者以外への公開範囲フィルタ
		Condition where = new Equals(Knowledge.OID, oid);
		if (!AuthHelper.isResponder()) {
			where = new And(where, new Equals(Knowledge.VISIBILITY, Visibility.pub.getValue()));
		}

		// ナレッジエンティティを読み込む (行の増殖を避けるため、tags/relatedInquiries は除外する)
		// マージ済バナー表示用に、mergedTo と統合先 Knowledge の name を eager fetch する
		Query knowledgeQuery = new Query()
				.select(
						Knowledge.OID,
						Knowledge.NAME,
						Knowledge.CONTENT,
						Knowledge.VISIBILITY,
						Knowledge.CREATE_BY,
						Knowledge.CREATE_DATE,
						Knowledge.UPDATE_DATE,
						Knowledge.MERGED_TO + ".oid",
						Knowledge.MERGED_TO + ".name")
				.from(Knowledge.DEFINITION_NAME)
				.where(where);

		SearchResult<Entity> knowledgeResult = em.searchEntity(knowledgeQuery);
		if (knowledgeResult == null
				|| knowledgeResult.getList() == null
				|| knowledgeResult.getList().isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("KNOWLEDGE_NOT_FOUND", "Knowledge not found: " + oid));
			return "ERROR";
		}

		Entity knowledge = knowledgeResult.getFirst();

		// 行の増殖を避けるため、タグは別クエリで読み込む
		List<Map<String, String>> tagList =
				EntityDaoHelper.loadTagsOf(em, Knowledge.DEFINITION_NAME, oid, Knowledge.TAGS);

		List<Map<String, String>> relatedInquiryList = loadRelatedInquiries(em, oid);

		Map<String, Object> data = buildKnowledgeMap(knowledge, tagList, relatedInquiryList);

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(data));
		return "SUCCESS";
	}

	private List<Map<String, String>> loadRelatedInquiries(EntityManager em, String knowledgeOid) {
		Query relQuery = new Query()
				.select(
						Knowledge.RELATED_INQUIRIES + "." + Inquiry.OID,
						Knowledge.RELATED_INQUIRIES + "." + Inquiry.NAME,
						Knowledge.RELATED_INQUIRIES + "." + Inquiry.SUMMARY_SHORT,
						Knowledge.RELATED_INQUIRIES + "." + Inquiry.STATUS)
				.from(Knowledge.DEFINITION_NAME)
				.where(new And(
						new Equals(Knowledge.OID, knowledgeOid),
						new IsNotNull(Knowledge.RELATED_INQUIRIES + "." + Inquiry.OID)));

		SearchResult<Entity> relResult = em.searchEntity(relQuery);
		List<Map<String, String>> relList = new ArrayList<>();

		if (relResult != null && relResult.getList() != null) {
			for (Entity row : relResult.getList()) {
				Map<String, String> relMap = new HashMap<>();
				relMap.put("oid", row.getValue(Knowledge.RELATED_INQUIRIES + "." + Inquiry.OID));
				relMap.put("name", row.getValue(Knowledge.RELATED_INQUIRIES + "." + Inquiry.NAME));
				relMap.put("summaryShort", row.getValue(Knowledge.RELATED_INQUIRIES + "." + Inquiry.SUMMARY_SHORT));
				// 関連問合せ行のステータスバッジ表示用
				SelectValue statusVal = row.getValue(Knowledge.RELATED_INQUIRIES + "." + Inquiry.STATUS);
				relMap.put("status", statusVal != null ? statusVal.getValue() : null);
				relList.add(relMap);
			}
		}

		return relList;
	}

	private Map<String, Object> buildKnowledgeMap(
			Entity knowledge, List<Map<String, String>> tagList, List<Map<String, String>> relatedInquiryList) {
		Map<String, Object> map = new HashMap<>();
		map.put("oid", knowledge.getOid());
		map.put("name", knowledge.getName());
		map.put("content", knowledge.getValue(Knowledge.CONTENT));
		SelectValue sv = knowledge.getValue(Knowledge.VISIBILITY);
		map.put("visibility", sv != null ? sv.getValue() : null);
		map.put("tags", tagList);
		map.put("relatedInquiries", relatedInquiryList);
		String cbOid = knowledge.getValue(Knowledge.CREATE_BY);
		map.put("createBy", EntityDaoHelper.toUserRef(EntityDaoHelper.loadUser(cbOid)));
		map.put("createDate", knowledge.getValue(Knowledge.CREATE_DATE));
		map.put("updateDate", knowledge.getValue(Knowledge.UPDATE_DATE));
		// マージ済バナー表示用に、mergedTo が null でない場合のみ {oid, name} のネスト Map を返す
		Object oidValue = knowledge.getValue(Knowledge.MERGED_TO + ".oid");
		if (oidValue != null) {
			Map<String, Object> mergedToMap = new LinkedHashMap<>();
			mergedToMap.put("oid", oidValue.toString());
			Object nameValue = knowledge.getValue(Knowledge.MERGED_TO + ".name");
			mergedToMap.put("name", nameValue == null ? null : nameValue.toString());
			map.put("mergedTo", mergedToMap);
		} else {
			map.put("mergedTo", null);
		}
		return map;
	}
}
