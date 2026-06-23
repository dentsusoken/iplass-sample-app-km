/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.tag.command;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import km.common.dao.EntityDaoHelper;
import km.common.util.CommandRequestUtil;
import km.common.util.CommandResponseUtil;
import km.tag.entity.Tag;
import org.iplass.mtp.command.Command;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.command.annotation.CommandClass;
import org.iplass.mtp.command.annotation.webapi.WebApi;
import org.iplass.mtp.command.annotation.webapi.WebApiResultAttribute;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.entity.query.SortSpec;
import org.iplass.mtp.entity.query.SortSpec.SortType;
import org.iplass.mtp.entity.query.condition.Condition;
import org.iplass.mtp.entity.query.condition.predicate.In;
import org.iplass.mtp.entity.query.condition.predicate.Like;
import org.iplass.mtp.entity.query.condition.predicate.Like.MatchPattern;
import org.iplass.mtp.webapi.definition.MethodType;
import org.iplass.mtp.webapi.definition.RequestType;

/**
 * タグを名前順で返す。キーワードフィルタ・oid フィルタ・ページングは任意で指定できる。
 *
 * <p>WebAPI: GET /api/km/tag/list</p>
 *
 * <p>パラメータ (すべて任意): {@code keyword} (tagName の部分一致)、{@code oids}
 * (oid で特定のタグを解決する。名前解決に使う)、{@code offset}、{@code limit}。
 * {@code limit} を省略すると一致するタグをすべて返すため、タグ全件を読み込む既存の呼び出し側は
 * そのまま動作する。</p>
 */
@WebApi(
		name = "km/tag/list",
		accepts = RequestType.REST_JSON,
		methods = MethodType.GET,
		responseResults = {@WebApiResultAttribute(name = "result")},
		privileged = false)
@CommandClass(name = "km/tag/TagListCommand")
public class TagListCommand implements Command {

	@Override
	public String execute(RequestContext request) {
		String keyword = request.getParam("keyword");
		String[] oids = request.getParams("oids");
		String limitParam = request.getParam("limit");
		boolean hasLimit = limitParam != null && !limitParam.isEmpty();
		int limit = CommandRequestUtil.getIntParam(request, "limit", 0);
		int offset = CommandRequestUtil.getIntParam(request, "offset", 0);

		// oids 指定時はその oid だけを名前解決の用途で返す。指定がなければ keyword でタグ名を部分一致検索する。
		Condition where = null;
		if (oids != null && oids.length > 0) {
			where = new In(Tag.OID, (Object[]) oids);
		} else if (keyword != null && !keyword.isEmpty()) {
			where = new Like(Tag.TAG_NAME, keyword, MatchPattern.PARTIAL);
		}

		EntityManager em = EntityDaoHelper.getEntityManager();

		Query dataQuery = new Query()
				.select(Tag.OID, Tag.TAG_NAME)
				.from(Tag.DEFINITION_NAME)
				.order(new SortSpec(Tag.TAG_NAME, SortType.ASC));
		if (where != null) {
			dataQuery.where(where);
		}
		if (hasLimit) {
			dataQuery.limit(limit, offset);
		}

		SearchResult<Entity> searchResult = em.searchEntity(dataQuery);

		List<Map<String, String>> tagList = new ArrayList<>();
		if (searchResult != null && searchResult.getList() != null) {
			for (Entity entity : searchResult.getList()) {
				tagList.add(EntityDaoHelper.toTagMap(entity));
			}
		}

		// limit 指定時のみ全体件数を別途数える。未指定 (全件取得) のときは取得件数がそのまま総数になる。
		int totalCount;
		if (hasLimit) {
			Query countQuery = new Query().select(Tag.OID).from(Tag.DEFINITION_NAME);
			if (where != null) {
				countQuery.where(where);
			}
			totalCount = em.count(countQuery);
		} else {
			totalCount = tagList.size();
		}

		CommandResponseUtil.setResult(
				request,
				CommandResponseUtil.successListResponse(
						tagList, totalCount, hasLimit ? offset : 0, hasLimit ? limit : tagList.size()));

		return "SUCCESS";
	}
}
