/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.command;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Map;
import km.common.auth.AuthHelper;
import km.common.dao.EntityDaoHelper;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.SelectValue;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;

/**
 * Command 単体テストの共通ユーティリティ。
 */
public final class CommandTestHelper {

	private CommandTestHelper() {}

	/**
	 * EntityDaoHelper の static method を mock 化して responder/EntityManager を制御する。
	 *
	 * <p>iPLAss テスト基盤の {@code MTPTest.setManagerMock(EntityManager.class, em)} を使うと、
	 * iPLAss 内部のロール解決 (RoleCacheLogic) も mock 化された EntityManager を経由してしまい
	 * Role Entity の query が空 → {@code userInRole == false} になるという構造的問題がある。
	 * このヘルパは {@code EntityDaoHelper} (本サンプルアプリ独自ヘルパ) の static method のみを
	 * mock することで、iPLAss 内部処理に一切干渉せず、Command の認可分岐と EM 経由ロジックを
	 * テスト側で完全制御する。</p>
	 *
	 * <p>典型的な使い方:
	 * <pre>{@code
	 * @Test
	 * void someTest() {
	 *   EntityManager em = mock(EntityManager.class);
	 *   try (var dao = mockEntityDaoHelper(em, true)) {  // isResponder = true
	 *     when(em.loadAndLock(...)).thenReturn(...);
	 *     String result = MTPTest.invokeCommand(command, request);
	 *     verify(em).update(...);
	 *   }
	 * }
	 * }</pre>
	 *
	 * @param em getEntityManager() が返す mock の EntityManager
	 * @param isResponder isResponder() の戻り値
	 * @return EntityDaoHelper と AuthHelper の static mock をまとめた AutoCloseable (try-with-resources で必ず close すること)
	 */
	public static DaoMocks mockEntityDaoHelper(EntityManager em, boolean isResponder) {
		MockedStatic<EntityDaoHelper> dao = mockStatic(EntityDaoHelper.class);
		dao.when(EntityDaoHelper::getEntityManager).thenReturn(em);
		// クエリ系の共通ヘルパは、テストで stub した EntityManager に対して実処理を走らせる。
		// （これらは Command 内の private メソッドから DAO 層へ集約したもので、Command が直接
		//  em.searchEntity を呼んでいた頃と同じ振る舞いをテストでも保つ。toTagList/loadUser 等の
		//  純変換・別クエリのヘルパは従来どおり既定モックのままにする。）
		dao.when(() -> EntityDaoHelper.exists(any(), any(), any())).thenCallRealMethod();
		dao.when(() -> EntityDaoHelper.loadPostContents(any(), any())).thenCallRealMethod();
		dao.when(() -> EntityDaoHelper.loadAllTags(any())).thenCallRealMethod();
		dao.when(() -> EntityDaoHelper.toRefs(any(), any())).thenCallRealMethod();
		dao.when(() -> EntityDaoHelper.selectValueOf(any(), any())).thenCallRealMethod();
		MockedStatic<AuthHelper> auth = mockStatic(AuthHelper.class);
		auth.when(AuthHelper::isResponder).thenReturn(isResponder);
		return new DaoMocks(dao, auth);
	}

	/**
	 * EntityDaoHelper (EM・DAO ヘルパ) と AuthHelper (認可) の static mock をまとめて扱う AutoCloseable。
	 * try-with-resources の終了時に両方を close する。
	 */
	public static final class DaoMocks implements AutoCloseable {
		private final MockedStatic<EntityDaoHelper> dao;
		private final MockedStatic<AuthHelper> auth;

		private DaoMocks(MockedStatic<EntityDaoHelper> dao, MockedStatic<AuthHelper> auth) {
			this.dao = dao;
			this.auth = auth;
		}

		@Override
		public void close() {
			auth.close();
			dao.close();
		}
	}

	/**
	 * 指定したエラーコードのエラーレスポンスが設定されたことを検証する。
	 */
	@SuppressWarnings("unchecked")
	public static void verifyErrorResponse(RequestContext request, String expectedErrorCode) {
		ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
		verify(request).setAttribute(eq("result"), captor.capture());
		Map<String, Object> response = captor.getValue();
		assertEquals("ERROR", response.get("status"));
		assertEquals(expectedErrorCode, response.get("errorCode"));
	}

	/**
	 * searchEntity の結果用に問合せエンティティを生成する。
	 */
	public static Entity createInquiry(String oid, String status) {
		return createInquiry(oid, status, null, "user001");
	}

	public static Entity createInquiry(String oid, String status, String creatorOid) {
		return createInquiry(oid, status, null, creatorOid);
	}

	public static Entity createInquiry(String oid, String status, String name, String creatorOid) {
		Entity inquiry = new GenericEntity("km.inquiry.Inquiry");
		inquiry.setOid(oid);
		if (name != null) {
			inquiry.setName(name);
		}
		inquiry.setValue("status", new SelectValue(status));
		inquiry.setValue("summaryShort", null);
		inquiry.setValue("summaryDetail", null);
		inquiry.setValue("closedDate", null);
		// createBy は searchEntity の結果では PrimitiveProperty (String の OID)
		inquiry.setValue("createBy", creatorOid);
		return inquiry;
	}

	/**
	 * searchEntity の結果用にナレッジエンティティを生成する。
	 */
	public static Entity createKnowledge(String oid, String visibility, String name) {
		Entity knowledge = new GenericEntity("km.knowledge.Knowledge");
		knowledge.setOid(oid);
		if (name != null) {
			knowledge.setName(name);
		}
		knowledge.setValue("visibility", new SelectValue(visibility));
		knowledge.setValue("content", null);
		knowledge.setValue("createBy", "user001");
		knowledge.setValue("createDate", null);
		knowledge.setValue("updateDate", null);
		return knowledge;
	}

	/**
	 * loadAndLock の結果用に問合せエンティティを生成する (status は SelectValue)。
	 * iPLAss の load/loadAndLock は Select プロパティを SelectValue オブジェクトとして返す。
	 */
	public static Entity createLoadedInquiry(String oid, String status, String creatorOid) {
		Entity inquiry = new GenericEntity("km.inquiry.Inquiry");
		inquiry.setOid(oid);
		inquiry.setValue("status", new SelectValue(status));
		inquiry.setValue("summaryShort", null);
		inquiry.setValue("summaryDetail", null);
		inquiry.setValue("closedDate", null);
		// createBy は PrimitiveProperty (String の OID)
		inquiry.setValue("createBy", creatorOid);
		return inquiry;
	}
}
