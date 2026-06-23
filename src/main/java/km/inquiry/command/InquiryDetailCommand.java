/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandResponseUtil;
import km.inquiry.entity.Inquiry;
import km.inquiry.entity.Post;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiParamMapping;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.BinaryReference;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.entity.query.SortSpec;
import org.iplass.mtp.entity.query.SortSpec.SortType;
import org.iplass.mtp.entity.query.condition.predicate.Equals;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * 投稿を含む問合せ詳細を返す。
 *
 * <p>WebAPI: GET /api/km/inquiry/detail/{oid}</p>
 *
 * <p>パスパラメータ {oid} は WebAPI の parameterMapping で ${0} として渡る。</p>
 */
@WebApi(
		name = "km/inquiry/detail",
		accepts = RequestType.REST_JSON,
		methods = MethodType.GET,
		responseResults = {@WebApiResultAttribute(name = "result")},
		paramMapping = @WebApiParamMapping(name = "oid", mapFrom = "${0}"),
		privileged = false)
@CommandClass(name = "km/inquiry/InquiryDetailCommand")
public class InquiryDetailCommand implements Command {

	@Override
	public String execute(RequestContext request) {
		String oid = request.getParam("oid");

		EntityManager em = EntityDaoHelper.getEntityManager();

		// 問合せエンティティを読み込む (行の増殖を避けるため、タグは除外する)
		Query inquiryQuery = new Query()
				.select(
						Inquiry.OID,
						Inquiry.NAME,
						Inquiry.SUMMARY_SHORT,
						Inquiry.SUMMARY_DETAIL,
						Inquiry.STATUS,
						Inquiry.CLOSED_DATE,
						Inquiry.CREATE_BY,
						Inquiry.CREATE_DATE)
				.from(Inquiry.DEFINITION_NAME)
				.where(new Equals(Inquiry.OID, oid));

		SearchResult<Entity> inquiryResult = em.searchEntity(inquiryQuery);
		if (inquiryResult == null
				|| inquiryResult.getList() == null
				|| inquiryResult.getList().isEmpty()) {
			CommandResponseUtil.setResult(
					request, CommandResponseUtil.errorResponse("INQUIRY_NOT_FOUND", "Inquiry not found: " + oid));

			return "ERROR";
		}

		Entity inquiry = inquiryResult.getFirst();

		// 行の増殖を避けるため、タグは別クエリで読み込む
		List<Map<String, String>> tagList = EntityDaoHelper.loadTagsOf(em, Inquiry.DEFINITION_NAME, oid, Inquiry.TAGS);

		// 問合せのレスポンスマップを組み立てる
		Map<String, Object> data = buildInquiryMap(inquiry, tagList);
		// Inquiry エンティティの posts パス式で投稿を読み込む (親子の Reference)
		Query postQuery = new Query()
				.select(
						Inquiry.POSTS + "." + Post.OID,
						Inquiry.POSTS + "." + Post.CONTENT,
						Inquiry.POSTS + "." + Post.ATTACHMENTS,
						Inquiry.POSTS + "." + Post.CREATE_BY,
						Inquiry.POSTS + "." + Post.CREATE_DATE,
						Inquiry.POSTS + "." + Post.UPDATE_DATE)
				.from(Inquiry.DEFINITION_NAME)
				.where(new Equals(Inquiry.OID, oid))
				.order(new SortSpec(Inquiry.POSTS + "." + Post.CREATE_DATE, SortType.ASC));

		SearchResult<Entity> postResult = em.searchEntity(postQuery);
		List<Map<String, Object>> postList = new ArrayList<>();

		if (postResult != null && postResult.getList() != null) {
			for (Entity row : postResult.getList()) {
				postList.add(buildPostMap(row));
			}
		}

		data.put("posts", postList);

		CommandResponseUtil.setResult(request, CommandResponseUtil.successResponse(data));
		return "SUCCESS";
	}

	private Map<String, Object> buildInquiryMap(Entity inquiry, List<Map<String, String>> tagList) {
		Map<String, Object> map = new HashMap<>();
		map.put("oid", inquiry.getOid());
		map.put("name", inquiry.getName());
		map.put("summaryShort", inquiry.getValue(Inquiry.SUMMARY_SHORT));
		map.put("summaryDetail", inquiry.getValue(Inquiry.SUMMARY_DETAIL));
		SelectValue sv = inquiry.getValue(Inquiry.STATUS);
		map.put("status", sv != null ? sv.getValue() : null);
		map.put("tags", tagList);
		map.put("closedDate", inquiry.getValue(Inquiry.CLOSED_DATE));
		String cbOid = inquiry.getValue(Inquiry.CREATE_BY);
		map.put("createBy", EntityDaoHelper.toUserRef(EntityDaoHelper.loadUser(cbOid)));
		map.put("createDate", inquiry.getValue(Inquiry.CREATE_DATE));
		return map;
	}

	private Map<String, Object> buildPostMap(Entity row) {
		Map<String, Object> map = new HashMap<>();
		// 投稿はパス式でアクセスする
		map.put("oid", row.getValue(Inquiry.POSTS + "." + Post.OID));
		map.put("content", row.getValue(Inquiry.POSTS + "." + Post.CONTENT));
		map.put("attachments", buildAttachmentList(row.getValue(Inquiry.POSTS + "." + Post.ATTACHMENTS)));
		String postCreateByOid = row.getValue(Inquiry.POSTS + "." + Post.CREATE_BY);
		map.put("createBy", EntityDaoHelper.toUserRef(EntityDaoHelper.loadUser(postCreateByOid)));
		map.put("createDate", row.getValue(Inquiry.POSTS + "." + Post.CREATE_DATE));
		map.put("updateDate", row.getValue(Inquiry.POSTS + "." + Post.UPDATE_DATE));
		return map;
	}

	private List<Map<String, Object>> buildAttachmentList(Object attachmentsValue) {
		List<Map<String, Object>> list = new ArrayList<>();
		if (attachmentsValue == null) {
			return list;
		}
		// iPLAss の Binary プロパティは BinaryReference または BinaryReference[] を返す
		if (attachmentsValue instanceof BinaryReference[]) {
			for (BinaryReference ref : (BinaryReference[]) attachmentsValue) {
				list.add(toBinaryMap(ref));
			}
		} else if (attachmentsValue instanceof BinaryReference) {
			list.add(toBinaryMap((BinaryReference) attachmentsValue));
		}
		return list;
	}

	private Map<String, Object> toBinaryMap(BinaryReference ref) {
		Map<String, Object> map = new HashMap<>();
		map.put("name", ref.getName());
		map.put("lobId", String.valueOf(ref.getLobId()));
		map.put("type", ref.getType());
		return map;
	}
}
