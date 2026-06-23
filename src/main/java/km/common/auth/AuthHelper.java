/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.auth;

import org.iplass.mtp.auth.AuthContext;
import org.iplass.mtp.auth.User;

/**
 * 認可判定と現在ユーザー取得のヘルパー。
 *
 * <p>本サンプルアプリのロール（回答者 / 利用者）判定と認証済みユーザーの取得を
 * {@link AuthContext} 経由で提供する。</p>
 */
public final class AuthHelper {

	/** 問合せ回答者のロール名 */
	public static final String ROLE_RESPONDER = "inquiry_responder";

	/** 問合せ利用者のロール名 */
	public static final String ROLE_USER = "inquiry_user";

	private AuthHelper() {}

	/**
	 * 現在のユーザーが回答者ロールを持つかどうかを返す。
	 */
	public static boolean isResponder() {
		return AuthContext.getCurrentContext().userInRole(ROLE_RESPONDER);
	}

	/**
	 * 現在認証されているユーザーを返す。
	 */
	public static User getCurrentUser() {
		return AuthContext.getCurrentContext().getUser();
	}

	/**
	 * 現在認証されているユーザーの OID を返す。
	 */
	public static String getCurrentUserOid() {
		return getCurrentUser().getOid();
	}

	/**
	 * 現在のユーザーのアプリ上のロール（回答者か利用者のいずれか単一）を返す。
	 */
	public static String currentUserRole() {
		return isResponder() ? ROLE_RESPONDER : ROLE_USER;
	}
}
