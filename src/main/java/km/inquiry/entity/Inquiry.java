/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.entity;

import java.sql.Timestamp;
import km.tag.entity.Tag;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SelectValue;

/**
 * 問合せ Entity
 */
public class Inquiry extends GenericEntity {

	private static final long serialVersionUID = 1L;

	/** Entity 定義名 */
	public static final String DEFINITION_NAME = "km.inquiry.Inquiry";

	/** 要約（一覧表示用） */
	public static final String SUMMARY_SHORT = "summaryShort";
	/** 要約（詳細表示用） */
	public static final String SUMMARY_DETAIL = "summaryDetail";
	/** ステータス */
	public static final String STATUS = "status";
	/** タグ */
	public static final String TAGS = "tags";
	/** 投稿一覧 */
	public static final String POSTS = "posts";
	/** クローズ日時 */
	public static final String CLOSED_DATE = "closedDate";
	/** 参照可能グループコード（複数値、作成時スナップショット） */
	public static final String ACCESSIBLE_GROUP_CODES = "accessibleGroupCodes";

	public Inquiry() {
		setDefinitionName(DEFINITION_NAME);
	}

	/**
	 * 要約（一覧表示用）を返します。
	 *
	 * @return 要約（一覧表示用）
	 */
	public String getSummaryShort() {
		return getValue(SUMMARY_SHORT);
	}

	/**
	 * 要約（一覧表示用）を設定します。
	 *
	 * @param summaryShort 要約（一覧表示用）
	 */
	public void setSummaryShort(String summaryShort) {
		setValue(SUMMARY_SHORT, summaryShort);
	}

	/**
	 * 要約（詳細表示用）を返します。
	 *
	 * @return 要約（詳細表示用）
	 */
	public String getSummaryDetail() {
		return getValue(SUMMARY_DETAIL);
	}

	/**
	 * 要約（詳細表示用）を設定します。
	 *
	 * @param summaryDetail 要約（詳細表示用）
	 */
	public void setSummaryDetail(String summaryDetail) {
		setValue(SUMMARY_DETAIL, summaryDetail);
	}

	/**
	 * ステータスを返します。
	 *
	 * @return ステータス
	 */
	public SelectValue getStatus() {
		return getValue(STATUS);
	}

	/**
	 * ステータスを設定します。
	 *
	 * @param status ステータス
	 */
	public void setStatus(SelectValue status) {
		setValue(STATUS, status);
	}

	/**
	 * タグを返します。
	 *
	 * @return タグ
	 */
	public Tag[] getTags() {
		Object value = getValue(TAGS);
		if (value instanceof Tag) {
			return new Tag[] {(Tag) value}; // 検索結果は単一要素で返るため配列に包む
		} else {
			return (Tag[]) value; // load 時は配列で返る
		}
	}

	/**
	 * タグを設定します。
	 *
	 * @param tags タグ
	 */
	public void setTags(Tag[] tags) {
		setValue(TAGS, tags);
	}

	/**
	 * 投稿一覧を返します。
	 *
	 * @return 投稿一覧
	 */
	public Post[] getPosts() {
		Object value = getValue(POSTS);
		if (value instanceof Post) {
			return new Post[] {(Post) value}; // 検索結果は単一要素で返るため配列に包む
		} else {
			return (Post[]) value; // load 時は配列で返る
		}
	}

	/**
	 * 投稿一覧を設定します。
	 *
	 * @param posts 投稿一覧
	 */
	public void setPosts(Post[] posts) {
		setValue(POSTS, posts);
	}

	/**
	 * クローズ日時を返します。
	 *
	 * @return クローズ日時
	 */
	public Timestamp getClosedDate() {
		return getValue(CLOSED_DATE);
	}

	/**
	 * クローズ日時を設定します。
	 *
	 * @param closedDate クローズ日時
	 */
	public void setClosedDate(Timestamp closedDate) {
		setValue(CLOSED_DATE, closedDate);
	}
}
