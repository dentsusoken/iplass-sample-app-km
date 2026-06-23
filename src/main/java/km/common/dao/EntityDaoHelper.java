/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.dao;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import km.inquiry.entity.Inquiry;
import km.inquiry.entity.Post;
import km.tag.entity.Tag;
import org.iplass.mtp.ManagerLocator;
import org.iplass.mtp.auth.User;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SearchResult;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.entity.query.Query;
import org.iplass.mtp.entity.query.SortSpec;
import org.iplass.mtp.entity.query.SortSpec.SortType;
import org.iplass.mtp.entity.query.condition.expr.And;
import org.iplass.mtp.entity.query.condition.predicate.Equals;
import org.iplass.mtp.entity.query.condition.predicate.IsNotNull;

/**
 * Entity 操作の共通ヘルパー。
 */
public class EntityDaoHelper {

	private EntityDaoHelper() {}

	// ── EntityManager 取得 ──

	/**
	 * EntityManager のインスタンスを返す。
	 * テナントコンテキストを正しく解決するため、呼び出しごとに ManagerLocator から取得する。
	 */
	public static EntityManager getEntityManager() {
		return ManagerLocator.getInstance().getManager(EntityManager.class);
	}

	// ── ユーザー参照マップの生成 ──

	/**
	 * Entity からユーザー参照マップ (oid, name) を生成する。
	 * userEntity が null のときは null を返す（ユーザー不在を表し、レスポンスでは createBy 等が null になる）。
	 */
	public static Map<String, String> toUserRef(Entity userEntity) {
		if (userEntity == null) {
			return null;
		}
		Map<String, String> ref = new HashMap<>();
		ref.put("oid", userEntity.getOid());
		ref.put("name", userEntity.getName());
		return ref;
	}

	/**
	 * OID を指定して User エンティティを読み込む。
	 * createBy はシステムプロパティのため searchEntity では OID 文字列として返る。その OID から User を引くときに使う。
	 */
	public static User loadUser(String userOid) {
		if (userOid == null) {
			return null;
		}
		return (User) getEntityManager().load(userOid, User.DEFINITION_NAME);
	}

	/**
	 * Entity の SelectValue プロパティの値を文字列で返す（SelectValue 以外はそのまま文字列化、null は null）。
	 */
	public static String selectValueOf(Entity entity, String propertyName) {
		Object value = entity.getValue(propertyName);
		if (value instanceof SelectValue sv) {
			return sv.getValue();
		}
		return value == null ? null : value.toString();
	}

	// ── タグ一覧の生成 ──

	/**
	 * Reference プロパティのタグ Entity を {oid, tagName} マップのリストに変換する。
	 */
	public static List<Map<String, String>> toTagList(Object tagsValue) {
		List<Map<String, String>> tagList = new ArrayList<>();
		if (tagsValue == null) {
			return tagList;
		}
		if (tagsValue instanceof Entity[]) {
			for (Entity tag : (Entity[]) tagsValue) {
				tagList.add(toTagMap(tag));
			}
		} else if (tagsValue instanceof Entity) {
			tagList.add(toTagMap((Entity) tagsValue));
		}
		return tagList;
	}

	/**
	 * Tag エンティティを {oid, tagName} マップに変換する。
	 */
	public static Map<String, String> toTagMap(Entity tag) {
		Map<String, String> tagMap = new HashMap<>();
		tagMap.put("oid", tag.getOid());
		tagMap.put("tagName", tag.getValue(Tag.TAG_NAME));
		return tagMap;
	}

	/**
	 * 親 Entity の tags Reference プロパティからタグマップを読み込む。
	 * LEFT OUTER JOIN の EQL を実行し、タグを持たない行は除外する。
	 *
	 * @param em                   EntityManager
	 * @param definitionName       親 Entity の定義名 (例: Inquiry.DEFINITION_NAME)
	 * @param ownerOid             親 Entity の OID
	 * @param tagsReferenceName    タグの Reference プロパティ名 (例: Inquiry.TAGS)
	 */
	public static List<Map<String, String>> loadTagsOf(
			EntityManager em, String definitionName, String ownerOid, String tagsReferenceName) {
		Query q = new Query()
				.select(tagsReferenceName + "." + Tag.OID, tagsReferenceName + "." + Tag.TAG_NAME)
				.from(definitionName)
				.where(new And(new Equals(Entity.OID, ownerOid), new IsNotNull(tagsReferenceName + "." + Tag.OID)));
		SearchResult<Entity> res = em.searchEntity(q);
		List<Map<String, String>> list = new ArrayList<>();
		if (res != null && res.getList() != null) {
			for (Entity row : res.getList()) {
				list.add(toTagMapFromRow(row, tagsReferenceName));
			}
		}
		return list;
	}

	/**
	 * 検索結果の行 (タグ Reference のパス式を含む) を {oid, tagName} マップに変換する内部ヘルパー。
	 * {@link #loadTagsOf} から使う。
	 */
	private static Map<String, String> toTagMapFromRow(Entity row, String tagsReferenceName) {
		Map<String, String> tagMap = new HashMap<>();
		tagMap.put("oid", row.getValue(tagsReferenceName + "." + Tag.OID));
		tagMap.put("tagName", row.getValue(tagsReferenceName + "." + Tag.TAG_NAME));
		return tagMap;
	}

	/**
	 * 登録済みの全タグを {oid: tagName} のマップで読み込む（タグマスタ）。
	 */
	public static Map<String, String> loadAllTags(EntityManager em) {
		Query q = new Query().select(Tag.OID, Tag.TAG_NAME).from(Tag.DEFINITION_NAME);
		SearchResult<Entity> result = em.searchEntity(q);
		Map<String, String> master = new LinkedHashMap<>();
		if (result != null && result.getList() != null) {
			for (Entity row : result.getList()) {
				String tagOid = row.getOid();
				Object tagName = row.getValue(Tag.TAG_NAME);
				if (tagOid != null) {
					master.put(tagOid, tagName != null ? tagName.toString() : "");
				}
			}
		}
		return master;
	}

	// ── 投稿本文の読み込み ──

	/**
	 * 問合せに紐づく投稿の本文を、投稿日時の昇順で読み込む。
	 */
	public static List<String> loadPostContents(EntityManager em, String inquiryOid) {
		Query q = new Query()
				.select(Inquiry.POSTS + "." + Post.OID, Inquiry.POSTS + "." + Post.CONTENT)
				.from(Inquiry.DEFINITION_NAME)
				.where(new Equals(Inquiry.OID, inquiryOid))
				.order(new SortSpec(Inquiry.POSTS + "." + Post.CREATE_DATE, SortType.ASC));
		SearchResult<Entity> result = em.searchEntity(q);
		List<String> contents = new ArrayList<>();
		if (result != null && result.getList() != null) {
			for (Entity row : result.getList()) {
				Object content = row.getValue(Inquiry.POSTS + "." + Post.CONTENT);
				if (content != null) {
					contents.add(content.toString());
				}
			}
		}
		return contents;
	}

	// ── 参照配列の生成 ──

	/**
	 * OID のリストから、指定した定義の参照 Entity 配列を生成する（Reference プロパティの更新値に使う）。
	 */
	public static Entity[] toRefs(List<String> oids, String definitionName) {
		Entity[] refs = new Entity[oids.size()];
		for (int i = 0; i < oids.size(); i++) {
			Entity ref = new GenericEntity(definitionName);
			ref.setOid(oids.get(i));
			refs[i] = ref;
		}
		return refs;
	}

	// ── EQL ヘルパー ──

	/**
	 * 指定した定義・OID のエンティティが存在するかどうかを返す。
	 */
	public static boolean exists(EntityManager em, String definitionName, String oid) {
		Query q = new Query().select(Entity.OID).from(definitionName).where(new Equals(Entity.OID, oid));
		SearchResult<Entity> result = em.searchEntity(q);
		return result != null && result.getList() != null && !result.getList().isEmpty();
	}
}
